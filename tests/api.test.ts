import { test } from "node:test";
import assert from "node:assert/strict";
import { apiCall, apiCallOrThrow, isApiResult, readJsonSafe, ApiCallError } from "@devmentor/ui/backend/api";

test("client parses defensively and rejects external/traversal URLs", async () => {
  assert.equal(await readJsonSafe(new Response("not JSON")), null);
  assert.equal(isApiResult({ ok: false, error: { code: "BAD", message: "bad", fieldErrors: { name: "invalid" } } }), false);
  await assert.rejects(apiCall("https://attacker/api/users"));
  await assert.rejects(apiCall("/api/../users"));
  await assert.rejects(apiCall("/api/%2e%2e/users"));
});
test("client sets CSRF and same-origin credentials and handles errors", async (t) => {
  t.mock.method(globalThis, "fetch", async (_path: string, options: RequestInit) => {
    assert.equal(new Headers(options.headers).get("X-DevMentor-CSRF"), "1");
    assert.equal(options.credentials, "same-origin");
    return Response.json({ ok: true, data: ["one"] });
  });
  assert.deepEqual(await apiCall("/api/demo?page=1"), { ok: true, data: ["one"] });
  t.mock.restoreAll();
  t.mock.method(globalThis, "fetch", async () => new Response("<html>failed</html>", { status: 500 }));
  assert.equal((await apiCall("/api/demo")).ok, false);
  t.mock.restoreAll();
  t.mock.method(globalThis, "fetch", async () => Response.json({ ok: false, error: { code: "VALIDATION_ERROR", message: "bad", fieldErrors: { name: ["required"] } } }, { status: 400 }));
  await assert.rejects(apiCallOrThrow("/api/demo"), ApiCallError);
  t.mock.restoreAll();
  t.mock.method(globalThis, "fetch", async () => { throw new Error("offline"); });
  assert.deepEqual(await apiCall("/api/demo"), { ok: false, error: { code: "NETWORK_ERROR", message: "Unable to reach the server" } });
});
