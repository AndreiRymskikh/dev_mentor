vi.mock("bcryptjs", () => ({ hash: vi.fn().mockResolvedValue("hashed") }));
vi.mock("node:timers/promises", () => ({ setTimeout: vi.fn().mockResolvedValue(undefined) }));
import { expect, test, vi } from "vitest";
import { hash } from "bcryptjs";
import { createHash } from "node:crypto";
import { PasswordRecoveryRepository, createDatabaseRuntime, User, Credential, ActionToken, AuthSession } from "../packages/db/src";
import { PasswordRecoveryService } from "../packages/core/src/services/users/password-recovery.service";
import { passwordForgotSchema, passwordResetSchema, registerSchema } from "@devmentor/core/validators/users";
import { createAppContainer } from "@devmentor/core/container";
import { POST as requestPost, dynamic as requestDynamic } from "../packages/app/src/app/api/auth/password/forgot/route";
import { POST as confirmPost, dynamic as confirmDynamic } from "../packages/app/src/app/api/auth/password/reset/route";

function setup() {
  const repository = { issue: vi.fn().mockResolvedValue("user"), invalidate: vi.fn().mockResolvedValue(undefined), eligible: vi.fn().mockResolvedValue(true), reset: vi.fn().mockResolvedValue(true) };
  const limits = { email: vi.fn().mockResolvedValue(undefined) };
  const email = { assertConfigured: vi.fn(), send: vi.fn().mockResolvedValue(undefined) };
  const log = { warn: vi.fn() };
  return { repository, limits, email, log, service: new PasswordRecoveryService(repository, limits, email, log) };
}
test("forgot rejects unsafe shapes before effects and normalizes email", async () => {
  const f = setup();
  expect(registerSchema).toBeDefined();
  expect(passwordForgotSchema.parse({ email: " A@Example.test " })).toEqual({ email: "a@example.test" });
  expect(passwordResetSchema.safeParse({ token: "short", newPassword: "abcdefghijkl" }).success).toBe(false);
  await expect(f.service.forgot({ email: "invalid" }, "ip")).rejects.toMatchObject({ status: 400 });
  for (const input of [null, {}, { email: "invalid" }, { email: "a@example.test", userId: "forged" }]) await expect(f.service.forgot(input, "ip")).rejects.toMatchObject({ status: 400 });
  expect(f.repository.issue).not.toHaveBeenCalled();
  const before = Date.now();
  const result = await f.service.forgot({ email: " A@Example.test " }, "ip");
  expect(f.limits.email).toHaveBeenCalledWith("a@example.test", "ip");
  const [email, digest, expiry] = f.repository.issue.mock.calls[0];
  const message = f.email.send.mock.calls[0][0];
  expect(email).toBe("a@example.test"); expect(expiry.getTime()).toBeGreaterThanOrEqual(before + 1800000);
  expect(message).toEqual({ type: "password-reset", to: email, token: expect.stringMatching(/^[A-Za-z0-9_-]{43}$/) });
  expect(digest).toBe(createHash("sha256").update(message.token).digest("hex"));
  f.repository.issue.mockResolvedValueOnce(null);
  expect(await f.service.forgot({ email }, "ip")).toEqual(result); expect(f.email.send).toHaveBeenCalledOnce();
  f.email.send.mockRejectedValue(new Error("private"));
  expect(await f.service.forgot({ email }, "ip")).toEqual(result);
  expect(f.repository.invalidate).toHaveBeenCalledWith("user", f.repository.issue.mock.calls[2][1]);
  f.repository.invalidate.mockRejectedValue(new Error("private"));
  await f.service.forgot({ email }, "ip");
  expect(f.log.warn.mock.calls).toEqual([["emails.password_reset.delivery_failed"], ["emails.password_reset.delivery_failed"], ["emails.password_reset.invalidation_failed"]]);
});
test("forgot outcomes use the same public completion window for unknown, delivered, stalled and overrun outcomes", async () => {
  const { setTimeout: wait } = await import("node:timers/promises"); const clock = vi.spyOn(Date, "now");
  try {
    for (const outcome of ["unknown", "delivered", "stalled", "overrun"]) {
      const f = setup(); clock.mockReturnValue(100000); vi.mocked(wait).mockClear();
      if (outcome === "unknown") f.repository.issue.mockResolvedValueOnce(null);
      f.email.send.mockImplementationOnce(async () => { if (outcome === "stalled" || outcome === "overrun") { clock.mockReturnValue(outcome === "stalled" ? 110000 : 116000); throw new Error("SMTP"); } });
      await f.service.forgot({ email: "a@example.test" }, "ip");
      if (outcome === "overrun") expect(wait).not.toHaveBeenCalled(); else expect(wait).toHaveBeenCalledWith(outcome === "stalled" ? 5000 : 15000);
    }
  } finally { clock.mockRestore(); }
});
test("routes enforce CSRF, strict JSON and no-store; composition stays scoped with fixed logs", async () => {
  const request = (body: unknown, csrf = "1") => new Request("http://localhost/api/auth/password", { method: "POST", headers: { "content-type": "application/json", "X-DevMentor-CSRF": csrf }, body: JSON.stringify(body) });
  expect([requestDynamic, confirmDynamic]).toEqual(["force-dynamic", "force-dynamic"]);
  const req = vi.spyOn(PasswordRecoveryService.prototype, "forgot").mockResolvedValue({ message: "generic" });
  const confirm = vi.spyOn(PasswordRecoveryService.prototype, "reset").mockResolvedValue({ message: "verified" });
  try {
    for (const post of [requestPost, confirmPost]) expect((await post(request({}, "0"))).status).toBe(403);
    const a = await requestPost(request({ email: "a@example.test" })); const b = await confirmPost(request({ token: "raw" }));
    expect([a.status, b.status]).toEqual([202, 200]);
    for (const response of [a,b]) { expect(response.headers.get("cache-control")).toBe("no-store"); expect(response.headers.get("set-cookie")).toBeNull(); }
    expect(req).toHaveBeenCalledWith({ email: "a@example.test" }, "shared-untrusted-peer"); expect(confirm).toHaveBeenCalledWith({ token: "raw" });
  } finally { req.mockRestore(); confirm.mockRestore(); }
  const container = createAppContainer(); const a = container.createScope(); const b = container.createScope();
  try {
    expect(a.cradle.passwordRecoveryRepository).not.toBe(b.cradle.passwordRecoveryRepository); expect(a.cradle.passwordRecoveryService).not.toBe(b.cradle.passwordRecoveryService);
    vi.spyOn(a.cradle.rateLimitService, "email").mockResolvedValue(); vi.spyOn(a.cradle.emailSender, "assertConfigured").mockImplementation(() => {});
    vi.spyOn(a.cradle.passwordRecoveryRepository, "issue").mockResolvedValue("user"); vi.spyOn(a.cradle.passwordRecoveryRepository, "invalidate").mockResolvedValue();
    vi.spyOn(a.cradle.emailSender, "send").mockRejectedValue(new Error("secret")); const warn = vi.spyOn(a.cradle.logger, "warn").mockImplementation(() => {});
    await a.cradle.passwordRecoveryService.forgot({ email: "a@example.test" }, "ip"); expect(warn).toHaveBeenCalledWith({ event: "emails.password_reset.delivery_failed" }, "Email delivery event");
  } finally { vi.restoreAllMocks(); await a.dispose(); await b.dispose(); await container.dispose(); }
});

test("reset validates strict fields and UTF8 bytes before lookup, and never hashes invalid candidates", async () => {
  const f = setup();
  const token = "a".repeat(43);
  const valid = { token, newPassword: "abcdefghijkl" };
  for (const input of [null, {}, { ...valid, userId: "forged" }, { ...valid, token: "bad" }, { ...valid, newPassword: "short" }, { ...valid, newPassword: "é".repeat(37) }]) {
    await expect(f.service.reset(input)).rejects.toMatchObject({ status: 400 });
  }
  expect(f.repository.eligible).not.toHaveBeenCalled();
  vi.mocked(hash).mockClear();
  f.repository.eligible.mockResolvedValueOnce(false);
  await expect(f.service.reset(valid)).rejects.toMatchObject({ status: 400 });
  expect(hash).not.toHaveBeenCalled();
  expect(f.repository.reset).not.toHaveBeenCalled();
  expect(await f.service.reset(valid)).toEqual({ message: "Password reset. Log in with your new password." });
  const digest = createHash("sha256").update(token).digest("hex");
  expect(f.repository.eligible).toHaveBeenLastCalledWith(digest);
  expect(hash).toHaveBeenLastCalledWith(valid.newPassword, 12);
  expect(f.repository.reset).toHaveBeenLastCalledWith(digest, "hashed");
  expect(passwordResetSchema.safeParse({ token, newPassword: "é".repeat(6) }).success).toBe(true);
  expect(passwordResetSchema.safeParse({ token, newPassword: "é".repeat(36) }).success).toBe(true);
  f.repository.reset.mockResolvedValueOnce(false);
  await expect(f.service.reset(valid)).rejects.toMatchObject({ status: 400 });
  f.repository.eligible.mockRejectedValueOnce(new Error("SQL"));
  await expect(f.service.reset(valid)).rejects.toMatchObject({ status: 503 });
  vi.mocked(hash).mockRejectedValueOnce(new Error("bcrypt"));
  await expect(f.service.reset(valid)).rejects.toMatchObject({ status: 503 });
  f.repository.reset.mockRejectedValueOnce(new Error("SQL"));
  await expect(f.service.reset(valid)).rejects.toMatchObject({ status: 503 });
});

test("forgot denies quota, missing configuration and storage failures before delivery", async () => {
  const f = setup(); const input = { email: "a@example.test" };
  f.limits.email.mockRejectedValueOnce(new Error("quota"));
  await expect(f.service.forgot(input, "ip")).rejects.toThrow("quota");
  expect(f.email.assertConfigured).not.toHaveBeenCalled();
  f.email.assertConfigured.mockImplementationOnce(() => { throw new Error("config"); });
  await expect(f.service.forgot(input, "ip")).rejects.toThrow("config");
  expect(f.repository.issue).not.toHaveBeenCalled();
  f.repository.issue.mockRejectedValueOnce(new Error("SQL"));
  await expect(f.service.forgot(input, "ip")).rejects.toMatchObject({ status: 503 });
  expect(f.email.send).not.toHaveBeenCalled();
});

test("repository serializes issue, scoped cleanup and atomic reset with existing credential and all-session revocation", async () => {
  const runtime = createDatabaseRuntime();
  const findOne = vi.fn(); const findOneOrFail = vi.fn().mockResolvedValue({ id: "user" });
  const nativeUpdate = vi.fn().mockResolvedValue(1); const create = vi.fn(); const flush = vi.fn(); const execute = vi.fn();
  const em = { findOne, findOneOrFail, nativeUpdate, create, flush, execute };
  vi.spyOn(runtime, "transaction").mockImplementation(async work => work(em as never));
  vi.spyOn(runtime, "withEntityManager").mockImplementation(async work => work(em as never));
  const repository = new PasswordRecoveryRepository(runtime);
  findOne.mockResolvedValueOnce(null);
  expect(await repository.issue("absent", "digest", new Date())).toBeNull();
  findOne.mockResolvedValueOnce({ id: "user" }).mockResolvedValueOnce(null);
  expect(await repository.issue("credentialless", "digest", new Date())).toBeNull();
  expect(create).not.toHaveBeenCalled();
  findOne.mockResolvedValueOnce({ id: "user" }).mockResolvedValueOnce({ userId: "user" });
  const expiry = new Date();
  expect(await repository.issue("email", "digest", expiry)).toBe("user");
  expect(findOne.mock.calls.at(-2)).toEqual([User, { normalizedEmail: "email" }, { lockMode: expect.any(Number) }]);
  expect(create).toHaveBeenCalledWith(ActionToken, { id: expect.any(String), userId: "user", purpose: "reset-password", digest: "digest", expiresAt: expiry });
  expect(nativeUpdate).toHaveBeenCalledWith(ActionToken, { userId: "user", purpose: "reset-password", consumedAt: null }, { consumedAt: expect.any(Date) });
  expect(flush).toHaveBeenCalledOnce();
  await repository.invalidate("user", "issued");
  expect(execute).toHaveBeenCalledWith("select set_config(?, ?, true), set_config(?, ?, true)", ["lock_timeout", "1s", "statement_timeout", "1s"]);
  expect(nativeUpdate).toHaveBeenLastCalledWith(ActionToken, { userId: "user", digest: "issued", purpose: "reset-password", consumedAt: null }, { consumedAt: expect.any(Date) });
  for (const credential of [null, { userId: "user" }]) {
    findOne.mockResolvedValueOnce({ userId: "user" }).mockResolvedValueOnce(credential);
    expect(await repository.eligible("digest")).toBe(credential !== null);
  }
  findOne.mockResolvedValueOnce(null);
  expect(await repository.eligible("missing")).toBe(false);
  expect(findOne).toHaveBeenLastCalledWith(ActionToken, { digest: "missing", purpose: "reset-password", consumedAt: null, expiresAt: { $gt: expect.any(Date) } });
  findOne.mockResolvedValueOnce(null);
  expect(await repository.reset("missing", "hash")).toBe(false);
  findOne.mockResolvedValueOnce({ userId: "user" }).mockResolvedValueOnce(null);
  expect(await repository.reset("credentialless", "hash")).toBe(false);
  findOne.mockResolvedValueOnce({ userId: "user" }).mockResolvedValueOnce({ userId: "user" });
  nativeUpdate.mockResolvedValueOnce(0);
  expect(await repository.reset("stale", "hash")).toBe(false);
  findOne.mockResolvedValueOnce({ userId: "user" }).mockResolvedValueOnce({ userId: "user" });
  expect(await repository.reset("active", "hash")).toBe(true);
  expect(findOneOrFail).toHaveBeenLastCalledWith(User, { id: "user" }, { lockMode: expect.any(Number) });
  expect(nativeUpdate.mock.calls.slice(-4)).toEqual([
    [ActionToken, { digest: "active", userId: "user", purpose: "reset-password", consumedAt: null, expiresAt: { $gt: expect.any(Date) } }, { consumedAt: expect.any(Date) }],
    [Credential, { userId: "user" }, { passwordHash: "hash", passwordChangedAt: expect.any(Date) }],
    [User, { id: "user" }, { updatedAt: expect.any(Date) }],
    [AuthSession, { userId: "user", revokedAt: null }, { revokedAt: expect.any(Date) }],
  ]);
});
