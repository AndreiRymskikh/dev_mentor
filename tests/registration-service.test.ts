import { createHash } from "node:crypto";
import { expect, test, vi } from "vitest";
import { RegistrationService } from "../packages/core/src/services/users/registration.service";
import { ServiceUnavailableError } from "../packages/core/src/http/errors";

const input = { email: " Person@Example.test ", displayName: " Person ", password: "correct password" };
function setup() {
  const repository = { create: vi.fn().mockResolvedValue("id"), invalidateVerification: vi.fn().mockResolvedValue(undefined) };
  const limits = { registration: vi.fn().mockResolvedValue(undefined), email: vi.fn().mockResolvedValue(undefined) };
  const email = { assertConfigured: vi.fn(), send: vi.fn().mockResolvedValue(undefined) };
  const log = { warn: vi.fn() };
  return { repository, limits, email, log, service: new RegistrationService(repository, limits, email, log) };
}
test("validates before limits, configuration and persistence", async () => {
  const context = setup();
  for (const invalid of [undefined, { ...input, role: "administrator" }, { ...input, password: "short" }]) await expect(context.service.register(invalid, "ip")).rejects.toMatchObject({ status: 400 });
  expect(context.limits.registration).not.toHaveBeenCalled();
  expect(context.repository.create).not.toHaveBeenCalled();
  context.limits.registration.mockRejectedValueOnce(new ServiceUnavailableError());
  await expect(context.service.register(input, "ip")).rejects.toMatchObject({ status: 503 });
  context.limits.email.mockRejectedValueOnce(new Error("limited"));
  await expect(context.service.register(input, "ip")).rejects.toThrow("limited");
  context.email.assertConfigured.mockImplementationOnce(() => { throw new ServiceUnavailableError(); });
  await expect(context.service.register(input, "ip")).rejects.toMatchObject({ status: 503 });
  expect(context.repository.create).not.toHaveBeenCalled();
});
test("persists digest atomically before sending a 32-byte fragment token; duplicate has identical public result and limits", async () => {
  const context = setup();
  const before = Date.now();
  const result = await context.service.register(input, "ip");
  const record = context.repository.create.mock.calls[0][0];
  const message = context.email.send.mock.calls[0][0];
  expect(record).toMatchObject({ normalizedEmail: "person@example.test", displayName: "Person", passwordHash: expect.stringMatching(/^\$2b\$12\$/) });
  expect(message).toEqual({ type: "verification", to: "person@example.test", token: expect.stringMatching(/^[\w-]{43}$/) });
  expect(record.verificationDigest).toBe(createHash("sha256").update(message.token).digest("hex"));
  expect(record.verificationExpiresAt.getTime()).toBeGreaterThanOrEqual(before + 86400000);
  expect(record.verificationExpiresAt.getTime()).toBeLessThanOrEqual(Date.now() + 86400000);
  expect(JSON.stringify(record)).not.toContain(message.token);
  expect(context.repository.create.mock.invocationCallOrder[0]).toBeLessThan(context.email.send.mock.invocationCallOrder[0]);
  context.repository.create.mockResolvedValueOnce(null);
  expect(await context.service.register(input, "ip")).toEqual(result);
  expect(context.email.send).toHaveBeenCalledOnce();
  expect(context.limits.registration).toHaveBeenCalledTimes(2);
  expect(context.limits.email).toHaveBeenNthCalledWith(2, "person@example.test", "ip");
});
test("storage errors are safe and delivery/invalidation errors preserve generic success with fixed logs", async () => {
  const context = setup();
  context.repository.create.mockRejectedValueOnce(new Error("private SQL"));
  await expect(context.service.register(input, "ip")).rejects.toEqual(new ServiceUnavailableError());
  expect(context.email.send).not.toHaveBeenCalled();
  context.email.send.mockRejectedValue(new Error("secret SMTP"));
  const result = await context.service.register(input, "ip");
  expect(context.repository.invalidateVerification).toHaveBeenCalledWith("id", context.repository.create.mock.calls[1][0].verificationDigest);
  context.repository.invalidateVerification.mockRejectedValueOnce(new Error("private SQL"));
  expect(await context.service.register(input, "ip")).toEqual(result);
  expect(context.log.warn.mock.calls).toEqual([["emails.verification.delivery_failed"], ["emails.verification.delivery_failed"], ["emails.verification.invalidation_failed"]]);
});
