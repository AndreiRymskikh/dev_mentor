import { test } from "vitest";
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

test("all domain errors preserve custom and default messages and status", async () => {
  const { ForbiddenError, ValidationError, ConflictError, requireRole, assertOwnsBooking } = await import("@devmentor/core/http");
  for (const Constructor of [NotFoundError, UnauthorizedError, ForbiddenError, ValidationError, ConflictError]) {
    assert.ok(new Constructor().message);
    assert.equal(new Constructor("custom").message, "custom");
  }
  const session = { userId: "owner", role: "mentor" };
  assert.doesNotThrow(() => requireRole(session, "mentor"));
  assert.throws(() => requireRole(session, "student"), ForbiddenError);
  assert.doesNotThrow(() => assertOwnsBooking(session, { studentId: "owner" }));
  assert.throws(() => assertOwnsBooking(session, { studentId: "other" }), ForbiddenError);
  assert.deepEqual(await requireSession(request({}), async () => session), session);
  await assert.rejects(requireSession(request({}), async () => ({ userId: "" })), UnauthorizedError);
  await assert.rejects(requireSession(request({}), async () => ({ userId: 123 } as unknown as { userId: string })), UnauthorizedError);
  assert.doesNotThrow(() => requireCsrf(request({}, { "X-DevMentor-CSRF": "1", origin: "http://localhost" })));
  await assert.rejects(withScope(() => { throw new Error("scope failure"); }), /scope failure/);
  const { readEnv } = await import("@devmentor/core/config");
  assert.ok(readEnv().NODE_ENV);
});
test("CRUD supports list/update/delete, missing operations and root/nested validation", async () => {
  const empty = makeCrudRoute({ authorize: async () => {} });
  assert.equal((await empty.GET(new Request("http://localhost/api/demo"))).status, 404);
  for (const method of ["POST", "PUT", "DELETE"] as const) assert.equal((await empty[method](request({}))).status, 404);
  const schema = z.object({ name: z.string() });
  const route = makeCrudRoute({ authorize: async () => {}, list: async (): Promise<string[] | { name: string }> => ["one"], update: { schema, run: async (value) => value }, remove: { schema, run: async (value) => value } });
  assert.deepEqual((await (await route.GET(new Request("http://localhost/api/demo"))).json()).data, ["one"]);
  for (const method of ["PUT", "DELETE"] as const) assert.deepEqual((await (await route[method](request({ name: "test" }))).json()).data, { name: "test" });
  const invalid = makeCrudRoute({ authorize: async () => {}, create: { schema: z.string(), run: async (value) => value } });
  assert.ok((await (await invalid.POST(request({}))).json()).error.fieldErrors._form);
  const refined = z.object({ name: z.string().min(3).regex(/^X/), nested: z.object({ value: z.string() }) });
  const nested = makeCrudRoute({ authorize: async () => {}, create: { schema: refined, run: async (value) => value } });
  const errors = (await (await nested.POST(request({ name: "a", nested: { value: 1 } }))).json()).error.fieldErrors;
  assert.equal(errors.name.length, 2);
  assert.ok(errors["nested.value"]);
});
