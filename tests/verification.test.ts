vi.mock("node:timers/promises", () => ({ setTimeout: vi.fn().mockResolvedValue(undefined) }));
import { expect, test, vi } from "vitest";
import { createHash } from "node:crypto";
import { VerificationRepository, createDatabaseRuntime, User, Credential, ActionToken } from "../packages/db/src";
import { VerificationService } from "../packages/core/src/services/users/verification.service";
import { verificationRequestSchema, verificationConfirmSchema, registerSchema } from "@devmentor/core/validators/users";
import { createAppContainer } from "@devmentor/core/container";
import { POST as requestPost, dynamic as requestDynamic } from "../packages/app/src/app/api/auth/verification/request/route";
import { POST as confirmPost, dynamic as confirmDynamic } from "../packages/app/src/app/api/auth/verification/confirm/route";

function setup() {
  const repository = { issue: vi.fn().mockResolvedValue("user"), invalidate: vi.fn().mockResolvedValue(undefined), confirm: vi.fn().mockResolvedValue(true) };
  const limits = { email: vi.fn().mockResolvedValue(undefined) };
  const email = { assertConfigured: vi.fn(), send: vi.fn().mockResolvedValue(undefined) };
  const log = { warn: vi.fn() };
  return { repository, limits, email, log, service: new VerificationService(repository, limits, email, log) };
}
test("verification rejects unsafe shapes before effects and normalizes email", async () => {
  const f = setup();
  expect(registerSchema).toBeDefined();
  expect(verificationRequestSchema.parse({ email: " A@Example.test " })).toEqual({ email: "a@example.test" });
  expect(verificationConfirmSchema.safeParse({ token: "short" }).success).toBe(false);
  await expect(f.service.request({ email: "invalid" }, "ip")).rejects.toMatchObject({ fieldErrors: { email: expect.any(Array) } });
  for (const input of [null, {}, { email: "invalid" }, { email: "a@example.test", userId: "forged" }]) await expect(f.service.request(input, "ip")).rejects.toMatchObject({ status: 400 });
  expect(f.repository.issue).not.toHaveBeenCalled();
  const before = Date.now();
  const result = await f.service.request({ email: " A@Example.test " }, "ip");
  expect(f.limits.email).toHaveBeenCalledWith("a@example.test", "ip");
  const [email, digest, expiry] = f.repository.issue.mock.calls[0];
  const message = f.email.send.mock.calls[0][0];
  expect(email).toBe("a@example.test"); expect(expiry.getTime()).toBeGreaterThanOrEqual(before + 86400000);
  expect(message).toEqual({ type: "verification", to: email, token: expect.stringMatching(/^[A-Za-z0-9_-]{43}$/) });
  expect(digest).toBe(createHash("sha256").update(message.token).digest("hex"));
  f.repository.issue.mockResolvedValueOnce(null);
  expect(await f.service.request({ email }, "ip")).toEqual(result); expect(f.email.send).toHaveBeenCalledOnce();
  f.email.send.mockRejectedValue(new Error("private"));
  expect(await f.service.request({ email }, "ip")).toEqual(result);
  expect(f.repository.invalidate).toHaveBeenCalledWith("user", f.repository.issue.mock.calls[2][1]);
  f.repository.invalidate.mockRejectedValue(new Error("private"));
  await f.service.request({ email }, "ip");
  expect(f.log.warn.mock.calls).toEqual([["emails.verification.delivery_failed"], ["emails.verification.delivery_failed"], ["emails.verification.invalidation_failed"]]);
});
test("verification denies limits/config/storage failures, sanitizes token errors and hashes lookup", async () => {
  const f = setup(); const input = { email: "a@example.test" };
  f.limits.email.mockRejectedValueOnce(new Error("limited")); await expect(f.service.request(input, "ip")).rejects.toThrow("limited");
  f.email.assertConfigured.mockImplementationOnce(() => { throw new Error("config"); }); await expect(f.service.request(input, "ip")).rejects.toThrow("config");
  f.repository.issue.mockRejectedValueOnce(new Error("SQL")); await expect(f.service.request(input, "ip")).rejects.toMatchObject({ status: 503 });
  for (const token of ["", "a".repeat(42), "a".repeat(44), "!".repeat(43), undefined]) await expect(f.service.confirm({ token })).rejects.toMatchObject({ status: 400, message: "Invalid or expired verification token" });
  expect(f.repository.confirm).not.toHaveBeenCalled();
  const token = "a".repeat(43); expect(await f.service.confirm({ token })).toEqual({ message: "Email verified. You may now log in." });
  expect(f.repository.confirm).toHaveBeenCalledWith(createHash("sha256").update(token).digest("hex"));
  f.repository.confirm.mockResolvedValueOnce(false); await expect(f.service.confirm({ token })).rejects.toMatchObject({ status: 400 });
  f.repository.confirm.mockRejectedValueOnce(new Error("private")); await expect(f.service.confirm({ token })).rejects.toMatchObject({ status: 503 });
});
test("resends use the same public completion window for unknown, delivered, stalled and overrun outcomes", async () => {
  const { setTimeout: wait } = await import("node:timers/promises"); const clock = vi.spyOn(Date, "now");
  try {
    for (const outcome of ["unknown", "delivered", "stalled", "overrun"]) {
      const f = setup(); clock.mockReturnValue(100000); vi.mocked(wait).mockClear();
      if (outcome === "unknown") f.repository.issue.mockResolvedValueOnce(null);
      f.email.send.mockImplementationOnce(async () => { if (outcome === "stalled" || outcome === "overrun") { clock.mockReturnValue(outcome === "stalled" ? 110000 : 116000); throw new Error("SMTP"); } });
      await f.service.request({ email: "a@example.test" }, "ip");
      if (outcome === "overrun") expect(wait).not.toHaveBeenCalled(); else expect(wait).toHaveBeenCalledWith(outcome === "stalled" ? 5000 : 15000);
    }
  } finally { clock.mockRestore(); }
});
test("repository serializes replacement and validates current persisted token atomically", async () => {
  const runtime = createDatabaseRuntime(); const findOne = vi.fn(); const findOneOrFail = vi.fn().mockResolvedValue({ id: "user" });
  const nativeUpdate = vi.fn().mockResolvedValue(1); const create = vi.fn(); const flush = vi.fn(); const execute = vi.fn();
  vi.spyOn(runtime, "transaction").mockImplementation(async (work) => work({ findOne, findOneOrFail, nativeUpdate, create, flush, execute } as never));
  const repository = new VerificationRepository(runtime);
  for (const user of [null, { id: "user", emailVerifiedAt: new Date() }, { id: "user", emailVerifiedAt: null }]) {
    findOne.mockResolvedValueOnce(user); if (user && !user.emailVerifiedAt) findOne.mockResolvedValueOnce(null);
    expect(await repository.issue("a@example.test", "digest", new Date())).toBeNull();
  }
  expect(create).not.toHaveBeenCalled();
  findOne.mockResolvedValueOnce({ id: "user" }).mockResolvedValueOnce({ userId: "user" });
  const expiry = new Date(); expect(await repository.issue("a@example.test", "digest", expiry)).toBe("user");
  expect(findOne.mock.calls.at(-2)?.[0]).toBe(User); expect(findOne.mock.calls.at(-1)).toEqual([Credential, { userId: "user" }]);
  expect(create).toHaveBeenCalledWith(ActionToken, { id: expect.any(String), userId: "user", purpose: "verify-email", digest: "digest", expiresAt: expiry });
  expect(nativeUpdate).toHaveBeenCalledWith(ActionToken, { userId: "user", purpose: "verify-email", consumedAt: null }, { consumedAt: expect.any(Date) });
  await repository.invalidate("user", "digest"); expect(execute).toHaveBeenCalledOnce();
  expect(nativeUpdate).toHaveBeenLastCalledWith(ActionToken, { userId: "user", digest: "digest", purpose: "verify-email", consumedAt: null }, { consumedAt: expect.any(Date) });
  findOne.mockResolvedValueOnce(null); expect(await repository.confirm("missing")).toBe(false);
  findOne.mockResolvedValueOnce({ userId: "user" }); nativeUpdate.mockResolvedValueOnce(0); expect(await repository.confirm("stale")).toBe(false);
  findOne.mockResolvedValueOnce({ userId: "user" }); expect(await repository.confirm("digest")).toBe(true);
  expect(nativeUpdate.mock.calls.at(-2)).toEqual([ActionToken, { digest: "digest", userId: "user", purpose: "verify-email", consumedAt: null, expiresAt: { $gt: expect.any(Date) } }, { consumedAt: expect.any(Date) }]);
  expect(nativeUpdate).toHaveBeenLastCalledWith(User, { id: "user" }, { emailVerifiedAt: expect.any(Date), updatedAt: expect.any(Date) });
});
test("routes enforce CSRF, strict JSON and no-store; composition stays scoped with fixed logs", async () => {
  const request = (body: unknown, csrf = "1") => new Request("http://localhost/api/auth/verification", { method: "POST", headers: { "content-type": "application/json", "X-DevMentor-CSRF": csrf }, body: JSON.stringify(body) });
  expect([requestDynamic, confirmDynamic]).toEqual(["force-dynamic", "force-dynamic"]);
  const req = vi.spyOn(VerificationService.prototype, "request").mockResolvedValue({ message: "generic" });
  const confirm = vi.spyOn(VerificationService.prototype, "confirm").mockResolvedValue({ message: "verified" });
  try {
    for (const post of [requestPost, confirmPost]) expect((await post(request({}, "0"))).status).toBe(403);
    const a = await requestPost(request({ email: "a@example.test" })); const b = await confirmPost(request({ token: "raw" }));
    expect([a.status, b.status]).toEqual([202, 200]);
    for (const response of [a,b]) { expect(response.headers.get("cache-control")).toBe("no-store"); expect(response.headers.get("set-cookie")).toBeNull(); }
    expect(req).toHaveBeenCalledWith({ email: "a@example.test" }, "shared-untrusted-peer"); expect(confirm).toHaveBeenCalledWith({ token: "raw" });
  } finally { req.mockRestore(); confirm.mockRestore(); }
  const container = createAppContainer(); const a = container.createScope(); const b = container.createScope();
  try {
    expect(a.cradle.verificationRepository).not.toBe(b.cradle.verificationRepository); expect(a.cradle.verificationService).not.toBe(b.cradle.verificationService);
    vi.spyOn(a.cradle.rateLimitService, "email").mockResolvedValue(); vi.spyOn(a.cradle.emailSender, "assertConfigured").mockImplementation(() => {});
    vi.spyOn(a.cradle.verificationRepository, "issue").mockResolvedValue("user"); vi.spyOn(a.cradle.verificationRepository, "invalidate").mockResolvedValue();
    vi.spyOn(a.cradle.emailSender, "send").mockRejectedValue(new Error("secret")); const warn = vi.spyOn(a.cradle.logger, "warn").mockImplementation(() => {});
    await a.cradle.verificationService.request({ email: "a@example.test" }, "ip"); expect(warn).toHaveBeenCalledWith({ event: "emails.verification.delivery_failed" }, "Email delivery event");
  } finally { vi.restoreAllMocks(); await a.dispose(); await b.dispose(); await container.dispose(); }
});
