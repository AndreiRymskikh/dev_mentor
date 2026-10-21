import { describe, expect, test, vi } from "vitest";
import { compare, getRounds } from "bcryptjs";
import { LockMode, UniqueConstraintViolationException } from "@mikro-orm/postgresql";
import { createDatabaseRuntime, RegistrationRepository, RateLimitRepository, User, UserRole, Credential, ActionToken } from "../packages/db/src";
import { registerSchema } from "../packages/core/src/validators/users/register.schema";
import { hashPassword } from "../packages/core/src/services/credentials/password";
import { RateLimitService } from "../packages/core/src/services/limits/rate-limit.service";
import { RateLimitError, ServiceUnavailableError } from "../packages/core/src/http/errors";

describe("registration validation and password security", () => {
  test("normalizes identity, preserves passwords and rejects privilege injection", () => {
    const input = { email: " Test@Example.com ", displayName: " Person ", password: " password12345 " };
    expect(registerSchema.parse(input)).toEqual({ email: "test@example.com", displayName: "Person", password: input.password });
    for (const patch of [{ role: "administrator" }, { id: "forged" }, { email: "invalid" }, { email: "a".repeat(255) + "@example.com" }, { displayName: " " }, { displayName: "a".repeat(101) }, { password: "a".repeat(11) }, { password: "😀".repeat(19) }]) {
      expect(registerSchema.safeParse({ ...input, ...patch }).success).toBe(false);
    }
    for (const password of ["a".repeat(12), "a".repeat(72), "😀".repeat(18)]) expect(registerSchema.safeParse({ ...input, password }).success).toBe(true);
  });
  test("hashes with distinct salts at cost 12 without silent truncation", async () => {
    const password = "😀".repeat(18);
    const [first, second] = await Promise.all([hashPassword(password), hashPassword(password)]);
    expect(first).not.toBe(second);
    expect(getRounds(first)).toBe(12);
    expect(await compare(password, first)).toBe(true);
    expect(await compare("wrong password", first)).toBe(false);
    await expect(hashPassword("short")).rejects.toMatchObject({ status: 400, fieldErrors: { password: expect.any(Array) } });
    await expect(hashPassword(password + "a")).rejects.toMatchObject({ status: 400 });
  });
});

test("registration writes only explicit identity, baseline role and credential in one transaction", async () => {
  const runtime = createDatabaseRuntime();
  const create = vi.fn();
  const flush = vi.fn();
  const transaction = vi.spyOn(runtime, "transaction").mockImplementation(async (work) => work({ create, flush } as never));
  const repository = new RegistrationRepository(runtime);
  const input = { normalizedEmail: "person@example.test", displayName: "Person", passwordHash: "hash", verificationDigest: "a".repeat(64), verificationExpiresAt: new Date() };
  const id = await repository.create(input);
  expect(id).toMatch(/^[a-f0-9-]{36}$/);
  expect(create.mock.calls).toEqual([
    [User, { id, normalizedEmail: input.normalizedEmail, displayName: input.displayName, createdAt: expect.any(Date), updatedAt: expect.any(Date) }],
    [UserRole, { userId: id, role: "developer" }],
    [Credential, { userId: id, passwordHash: "hash", passwordChangedAt: expect.any(Date) }],
    [ActionToken, { id: expect.any(String), userId: id, purpose: "verify-email", digest: input.verificationDigest, expiresAt: input.verificationExpiresAt }],
  ]);
  expect(flush).toHaveBeenCalledOnce();
  transaction.mockRejectedValueOnce(new UniqueConstraintViolationException(new Error("sensitive constraint")));
  expect(await repository.create(input)).toBeNull();
  transaction.mockRejectedValueOnce(new Error("unavailable"));
  await expect(repository.create(input)).rejects.toThrow("unavailable");
});

test("atomic rate repository consumes every sorted bucket and retains denial results", async () => {
  const runtime = createDatabaseRuntime();
  const execute = vi.fn().mockResolvedValueOnce([{ attempt_count: 4, retry_after: 90 }]).mockResolvedValueOnce([{ attempt_count: 1, retry_after: 89 }]);
  vi.spyOn(runtime, "transaction").mockImplementation(async (work) => work({ execute } as never));
  const repository = new RateLimitRepository(runtime);
  expect(await repository.consume([{ keyDigest: "b", limit: 20 }, { keyDigest: "a", limit: 3 }])).toEqual({ allowed: false, retryAfterSeconds: 90 });
  expect(execute.mock.calls.map((call) => call[1])).toEqual([["a", 4], ["b", 21]]);
  execute.mockResolvedValueOnce([{ attempt_count: 1, retry_after: 1 }]);
  expect(await repository.consume([{ keyDigest: "a", limit: 3 }])).toEqual({ allowed: true, retryAfterSeconds: 1 });
});

test("rate service hashes operation-scoped identity, applies policy and denies config/storage outages", async () => {
  const consume = vi.fn().mockResolvedValue({ allowed: true, retryAfterSeconds: 60 });
  const service = new RateLimitService({ consume }, () => "s".repeat(32));
  await service.registration("127.0.0.1");
  await service.email(" Person@Example.com ", "127.0.0.1");
  const registration = consume.mock.calls[0][0];
  const email = consume.mock.calls[1][0];
  expect(registration).toEqual([{ keyDigest: expect.stringMatching(/^[a-f0-9]{64}$/), limit: 10 }]);
  expect(email.map((entry: { limit: number }) => entry.limit)).toEqual([3, 20]);
  expect(new Set([registration[0].keyDigest, ...email.map((entry: { keyDigest: string }) => entry.keyDigest)]).size).toBe(3);
  expect(JSON.stringify(consume.mock.calls)).not.toMatch(/127\.0\.0\.1|person@example/);
  await service.email("person@example.com", "127.0.0.1");
  expect(consume.mock.calls[2][0]).toEqual(email);
  const other = new RateLimitService({ consume }, () => "t".repeat(32));
  await other.registration("127.0.0.1");
  expect(consume.mock.calls[3][0]).not.toEqual(registration);
  consume.mockResolvedValueOnce({ allowed: false, retryAfterSeconds: 80 });
  await expect(service.registration("shared")).rejects.toMatchObject({ status: 429, retryAfterSeconds: 80 });
  consume.mockRejectedValueOnce(new Error("private database details"));
  await expect(service.registration("shared")).rejects.toEqual(new ServiceUnavailableError());
  for (const secret of [undefined, "", "short"]) {
    await expect(new RateLimitService({ consume }, () => secret).registration("shared")).rejects.toEqual(new ServiceUnavailableError());
  }
  await expect(new RateLimitService({ consume }, () => { throw new Error("config"); }).registration("shared")).rejects.toEqual(new ServiceUnavailableError());
  expect([0, 0.2, 4000, Infinity, NaN].map((value) => new RateLimitError(value).retryAfterSeconds)).toEqual([1, 1, 3600, 3600, 3600]);
});

 test("failed delivery invalidation locks user and conditionally updates only the issued active token", async () => {
  const runtime = createDatabaseRuntime();
  const execute = vi.fn();
  const findOneOrFail = vi.fn().mockResolvedValue({});
  const nativeUpdate = vi.fn();
  vi.spyOn(runtime, "transaction").mockImplementation(async (work) => work({ findOneOrFail, nativeUpdate, execute } as never));
  await new RegistrationRepository(runtime).invalidateVerification("user", "digest");
  expect(execute).toHaveBeenCalledWith("select set_config(?, ?, true), set_config(?, ?, true)", ["lock_timeout", "1s", "statement_timeout", "1s"]);
  expect(findOneOrFail.mock.calls[0][1]).toEqual({ id: "user" });
  expect(findOneOrFail.mock.calls[0][2]).toEqual({ lockMode: LockMode.PESSIMISTIC_WRITE });
  expect(nativeUpdate).toHaveBeenCalledWith(ActionToken, { userId: "user", purpose: "verify-email", digest: "digest", consumedAt: null }, { consumedAt: expect.any(Date) });
});
