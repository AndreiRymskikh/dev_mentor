import { test, vi } from "vitest";
import assert from "node:assert/strict";
import { apiCall, apiCallOrThrow, isApiResult, readJsonSafe, ApiCallError } from "@devmentor/ui/backend/api";

test("client parses defensively and rejects external/traversal URLs", async () => {
  assert.equal(await readJsonSafe(new Response("not JSON")), null);
  assert.equal(isApiResult({ ok: false, error: { code: "BAD", message: "bad", fieldErrors: { name: "invalid" } } }), false);
  await assert.rejects(apiCall("https://attacker/api/users"));
  await assert.rejects(apiCall("/api/../users"));
  await assert.rejects(apiCall("/api/%2e%2e/users"));
});
test("client sets CSRF and same-origin credentials and handles errors", async () => {
  vi.stubGlobal("fetch", async (_path: string, options: RequestInit) => {
    assert.equal(new Headers(options.headers).get("X-DevMentor-CSRF"), "1");
    assert.equal(options.credentials, "same-origin");
    return Response.json({ ok: true, data: ["one"] });
  });
  assert.deepEqual(await apiCall("/api/demo?page=1"), { ok: true, data: ["one"] });
  vi.unstubAllGlobals();
  vi.stubGlobal("fetch", async () => new Response("<html>failed</html>", { status: 500 }));
  assert.equal((await apiCall("/api/demo")).ok, false);
  vi.unstubAllGlobals();
  vi.stubGlobal("fetch", async () => Response.json({ ok: false, error: { code: "VALIDATION_ERROR", message: "bad", fieldErrors: { name: ["required"] } } }, { status: 400 }));
  await assert.rejects(apiCallOrThrow("/api/demo"), ApiCallError);
  vi.unstubAllGlobals();
  vi.stubGlobal("fetch", async () => { throw new Error("offline"); });
  assert.deepEqual(await apiCall("/api/demo"), { ok: false, error: { code: "NETWORK_ERROR", message: "Unable to reach the server" } });
});

test("client rejects malformed envelopes and honors valid success/error shapes", async () => {
  for (const value of [null, 1, [], { ok: 1 }, { ok: true }, { ok: false, error: null }, { ok: false, error: { code: 1, message: "bad" } }, { ok: false, error: { code: "BAD", message: 1 } }, { ok: false, error: { code: "BAD", message: "bad", fieldErrors: [] } }, { ok: false, error: { code: "BAD", message: "bad", fieldErrors: { x: [1] } } }]) assert.equal(isApiResult(value), false);
  assert.equal(isApiResult({ ok: true, data: null }), true);
  assert.equal(isApiResult({ ok: false, error: { code: "BAD", message: "bad" } }), true);
  assert.equal(isApiResult({ ok: false, error: { code: "BAD", message: "bad", fieldErrors: { x: ["bad"] } } }), true);
  await assert.rejects(apiCall("/api/demo#fragment"));
  await assert.rejects(apiCall("/api/./demo"));
  for (const [status, result] of [[200, { ok: false, error: { code: "BAD", message: "bad" } }], [500, { ok: true, data: null }]] as const) {
    vi.stubGlobal("fetch", async () => Response.json(result, { status }));
    assert.deepEqual(await apiCall("/api/demo"), { ok: false, error: { code: "INVALID_RESPONSE", message: "Unexpected server response" } });
  }
  vi.stubGlobal("fetch", async (_path: string, options: RequestInit) => {
    assert.equal(new Headers(options.headers).get("Content-Type"), "application/json");
    return Response.json({ ok: true, data: "saved" });
  });
  assert.equal(await apiCallOrThrow("/api/demo", { method: "POST", body: "{}" }), "saved");
  assert.equal(await apiCallOrThrow("/api/demo", { method: "POST", body: "{}", headers: { "Content-Type": "application/json" } }), "saved");
  const abort = new AbortController(); abort.abort();
  vi.stubGlobal("fetch", async () => { throw new Error("cancelled"); });
  await assert.rejects(apiCall("/api/demo", { signal: abort.signal }), /cancelled/);
  const active = new AbortController();
  assert.equal((await apiCall("/api/demo", { signal: active.signal })).ok, false);
  vi.stubGlobal("fetch", async (_path: string, options: RequestInit) => {
    assert.equal(new Headers(options.headers).has("Content-Type"), false);
    return Response.json({ ok: true, data: null });
  });
  assert.equal((await apiCall("/api/demo", { method: "POST", body: new FormData() })).ok, true);
});
