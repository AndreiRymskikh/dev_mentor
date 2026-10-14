import { test } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import { apiHandler, makeCrudRoute, requireSession, assertOwnership, requireCsrf, UnauthorizedError, NotFoundError } from "@devmentor/core/http";
import { createAppContainer, withScope } from "@devmentor/core/container";

const request = (body: unknown, headers: Record<string, string> = { "X-DevMentor-CSRF": "1" }) => new Request("http://localhost/api/demo", { method: "POST", headers, body: JSON.stringify(body) });
test("handler returns consistent success and safe failures", async () => {
  const req = new Request("http://localhost/api/health");
  assert.deepEqual(await (await apiHandler(() => ({ status: "ok" }))(req)).json(), { ok: true, data: { status: "ok" } });
  assert.deepEqual(await (await apiHandler(() => undefined)(req)).json(), { ok: true, data: null });
  const missing = await apiHandler(() => { throw new NotFoundError(); })(req);
  assert.equal(missing.status, 404);
  const failed = await apiHandler(() => { throw new Error("SECRET raw stack"); })(req);
  assert.equal(failed.status, 500);
  assert.equal((await failed.text()).includes("SECRET"), false);
});
test("auth resolver errors and missing ownership fail closed", async () => {
  await assert.rejects(requireSession(request({}), async () => { throw new Error("failure"); }), UnauthorizedError);
  await assert.rejects(requireSession(request({}), async () => null), UnauthorizedError);
  assert.throws(() => assertOwnership({ userId: "owner" }, undefined));
  assert.throws(() => assertOwnership({ userId: "owner" }, "other"));
  assert.doesNotThrow(() => assertOwnership({ userId: "owner" }, "owner"));
  assert.throws(() => requireCsrf(request({}, {})));
  assert.throws(() => requireCsrf(request({}, { "X-DevMentor-CSRF": "1", origin: "http://attacker" })));
});
test("CRUD authorizes before validation, validates input and strips extra fields", async () => {
  let calls = 0;
  const schema = z.object({ name: z.string().min(1) });
  const route = makeCrudRoute({ authorize: async () => {}, create: { schema, run: async (value) => { calls++; return value; } } });
  const bad = await route.POST(request({ name: "" }));
  assert.equal(bad.status, 400);
  assert.ok((await bad.json()).error.fieldErrors.name);
  assert.equal(calls, 0);
  assert.equal((await route.POST(request({ name: "ok" }, {}))).status, 403);
  const good = await route.POST(request({ name: "ok", status: "admin" }));
  assert.deepEqual(await good.json(), { ok: true, data: { name: "ok" } });
  const denied = makeCrudRoute({ authorize: async () => { throw new UnauthorizedError(); }, create: { schema, run: async () => { throw new Error("must not run"); } } });
  assert.equal((await denied.POST(request({}))).status, 401);
  const malformed = new Request("http://localhost/api/demo", { method: "POST", headers: { "X-DevMentor-CSRF": "1" }, body: "{" });
  assert.equal((await route.POST(malformed)).status, 400);
});
test("request scopes isolate scoped dependencies and preserve singleton logger", async () => {
  const container = createAppContainer();
  const first = container.createScope(); const second = container.createScope();
  assert.equal(first.cradle.requestId, first.cradle.requestId);
  assert.notEqual(first.cradle.requestId, second.cradle.requestId);
  assert.equal(first.cradle.logger, second.cradle.logger);
  await first.dispose(); await second.dispose(); await container.dispose();
  const ids = await Promise.all([withScope(({ requestId }) => requestId), withScope(({ requestId }) => requestId)]);
  assert.notEqual(ids[0], ids[1]);
});

test("server environment permits database-free boot but rejects invalid supplied secrets", async () => {
  const { readEnv } = await import("@devmentor/core/config");
  assert.equal(readEnv({}).NODE_ENV, "development");
  assert.throws(() => readEnv({ JWT_SECRET: "short" }), /Invalid server environment/);
  assert.throws(() => readEnv({ DATABASE_URL: "invalid" }), /Invalid server environment/);
});
