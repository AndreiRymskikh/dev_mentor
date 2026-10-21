vi.mock("node:timers/promises", () => ({ setTimeout: vi.fn().mockResolvedValue(undefined) }));
import { test, vi } from "vitest";
import assert from "node:assert/strict";
import { apiHandler, readJsonBody, RateLimitError, ServiceUnavailableError } from "@devmentor/core/http";
import { createAppContainer } from "@devmentor/core/container";
import { POST, dynamic } from "../packages/app/src/app/api/auth/register/route";
import { RegistrationService } from "../packages/core/src/services/users/registration.service";

const request = (body = "{}", headers: Record<string, string> = {}) => new Request("http://localhost/api/auth/register", { method: "POST", headers: { "content-type": "application/json", "X-DevMentor-CSRF": "1", ...headers }, body });

test("response metadata preserves envelopes, dynamic cookies, errors and no-store", async () => {
  const response = await apiHandler(() => ({ session: "fresh" }), { noStore: true, response: (data) => ({ status: 202, headers: { "X-Result": "accepted" }, cookies: [`session=${data!.session}; HttpOnly`, "binding=gone; Max-Age=0"] }) })(request());
  assert.equal(response.status, 202);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(response.headers.get("x-result"), "accepted");
  assert.equal(response.headers.getSetCookie().length, 2);
  assert.deepEqual(await response.json(), { ok: true, data: { session: "fresh" } });
  for (const error of [new RateLimitError(99999), new ServiceUnavailableError(), new Error("secret")]) {
    const failed = await apiHandler(() => { throw error; }, { noStore: true })(request());
    assert.equal(failed.headers.get("cache-control"), "no-store");
    assert.equal(failed.headers.get("retry-after"), error instanceof RateLimitError ? "3600" : null);
    assert.equal((await failed.text()).includes("secret"), false);
  }
});

test("bounded JSON rejects wrong/missing types, malformed/invalid utf8, absent bodies and streamed forged lengths", async () => {
  assert.deepEqual(await readJsonBody(request('{"a":1}', { "content-type": " Application/JSON ; charset=utf-8" })), { a: 1 });
  for (const req of [request("{}", { "content-type": "text/plain" }), new Request("http://localhost", { method: "POST" }), new Request("http://localhost", { method: "POST", headers: { "content-type": "application/json" } }), request("{"), request("{}", { "content-type": "" })]) await assert.rejects(readJsonBody(req));
  let cancelled = false;
  const stream = new ReadableStream<Uint8Array>({ start(controller) { controller.enqueue(new Uint8Array(4097)); }, cancel() { cancelled = true; } });
  const streamed = new Request("http://localhost", { method: "POST", headers: { "content-type": "application/json", "content-length": "1" }, body: stream, duplex: "half" } as RequestInit);
  await assert.rejects(readJsonBody(streamed));
  assert.equal(cancelled, true);
  await assert.rejects(readJsonBody(new Request("http://localhost", { method: "POST", headers: { "content-type": "application/json" }, body: new Uint8Array([255]) })));
  await assert.rejects(readJsonBody(request("{}"), 1));
  await assert.rejects(readJsonBody(new Request("http://localhost", { method: "POST", headers: { "content-type": "application/json" }, body: new ReadableStream({ start(controller) { controller.error(new Error("read failed")); } }), duplex: "half" } as RequestInit)));
});

test("registration route guards CSRF before services, passes untrusted input with shared peer and creates no session", async () => {
  const register = vi.spyOn(RegistrationService.prototype, "register").mockResolvedValue({ message: "generic" });
  try {
    assert.equal(dynamic, "force-dynamic");
    assert.equal((await POST(request("{}", { "X-DevMentor-CSRF": "0" }))).status, 403);
    assert.equal((await POST(request("{}", { origin: "https://attacker.test" }))).status, 403);
    assert.equal((await POST(request("{"))).status, 400);
    assert.equal(register.mock.calls.length, 0);
    for (const ip of ["1.2.3.4", "8.8.8.8"]) {
      const response = await POST(request('{"roles":["administrator"]}', { "x-forwarded-for": ip }));
      assert.equal(response.status, 202);
      assert.equal(response.headers.get("set-cookie"), null);
      assert.equal(response.headers.get("cache-control"), "no-store");
      assert.deepEqual(register.mock.calls.at(-1), [{ roles: ["administrator"] }, "shared-untrusted-peer"]);
    }
    register.mockRejectedValueOnce(new RateLimitError(30));
    const limited = await POST(request());
    assert.equal(limited.status, 429); assert.equal(limited.headers.get("retry-after"), "30");
  } finally { register.mockRestore(); }
});

test("composition is lazy, scoped and injectable, emits only fixed delivery events", async () => {
  const container = createAppContainer();
  const a = container.createScope(); const b = container.createScope();
  try {
    assert.notEqual(a.cradle.registrationRepository, b.cradle.registrationRepository);
    assert.notEqual(a.cradle.rateLimitRepository, b.cradle.rateLimitRepository);
    assert.notEqual(a.cradle.registrationService, b.cradle.registrationService);
    assert.notEqual(a.cradle.rateLimitService, b.cradle.rateLimitService);
    assert.notEqual(a.cradle.emailSender, b.cradle.emailSender);
    assert.equal(a.cradle.registrationService, a.cradle.registrationService);
    await assert.rejects(a.cradle.rateLimitService.registration("test"), ServiceUnavailableError);
    const warn = vi.spyOn(a.cradle.logger, "warn").mockImplementation(() => {});
    const create = vi.spyOn(a.cradle.registrationRepository, "create").mockResolvedValue("user");
    const invalidate = vi.spyOn(a.cradle.registrationRepository, "invalidateVerification").mockResolvedValue();
    const registration = vi.spyOn(a.cradle.rateLimitService, "registration").mockResolvedValue();
    const email = vi.spyOn(a.cradle.rateLimitService, "email").mockResolvedValue();
    const configured = vi.spyOn(a.cradle.emailSender, "assertConfigured").mockImplementation(() => {});
    const send = vi.spyOn(a.cradle.emailSender, "send").mockRejectedValue(new Error("sensitive"));
    await a.cradle.registrationService.register({ email: "test@example.test", password: "long password", displayName: "Test" }, "test");
    assert.deepEqual(warn.mock.calls, [[{ event: "emails.verification.delivery_failed" }, "Email delivery event"]]);
    for (const mock of [warn, create, invalidate, registration, email, configured, send]) mock.mockRestore();
  } finally { await a.dispose(); await b.dispose(); await container.dispose(); }
});

test("metadata failure is sanitized and never attaches successful cookies", async () => {
  const response = await apiHandler(() => "accepted", { noStore: true, response: () => { throw new Error("secret metadata"); } })(request());
  assert.equal(response.status, 500); assert.equal(response.headers.get("set-cookie"), null);
  assert.equal(response.headers.get("cache-control"), "no-store"); assert.equal((await response.text()).includes("secret"), false);
});

test("real registration endpoint denies missing server configuration safely", async () => {
  const previous = process.env.RATE_LIMIT_SECRET;
  delete process.env.RATE_LIMIT_SECRET;
  try {
    const response = await POST(request(JSON.stringify({ email: "test@example.test", password: "long password", displayName: "Test" })));
    assert.equal(response.status, 503); assert.equal(response.headers.get("cache-control"), "no-store");
    assert.deepEqual(await response.json(), { ok: false, error: { code: "SERVICE_UNAVAILABLE", message: "Service temporarily unavailable" } });
  } finally { if (previous === undefined) delete process.env.RATE_LIMIT_SECRET; else process.env.RATE_LIMIT_SECRET = previous; }
});

test("CSRF trusted configured origin handles canonical Next URLs and rejects malformed overrides", async () => {
  const { requireCsrf } = await import("@devmentor/core/http");
  const canonical = (origin?: string) => request("{}", origin ? { origin } : {});
  assert.doesNotThrow(() => requireCsrf(canonical("https://public.example.test"), "https://public.example.test/"));
  assert.doesNotThrow(() => requireCsrf(canonical("http://localhost")));
  assert.doesNotThrow(() => requireCsrf(canonical(), "https://public.example.test"));
  assert.throws(() => requireCsrf(canonical("http://localhost"), "https://public.example.test"));
  for (const invalid of ["", "broken", "ftp://public.example.test", "https://user:pass@public.example.test", "https://public.example.test/path", "https://public.example.test?query=1", "https://public.example.test#token"]) {
    assert.throws(() => requireCsrf(canonical(), invalid), ServiceUnavailableError);
  }
});
