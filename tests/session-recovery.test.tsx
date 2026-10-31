import assert from "node:assert/strict";
import { test, vi } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { JSDOM } from "jsdom";
import { protectedRequest } from "../packages/app/src/auth/protected-request";
import { PrivateContent } from "../packages/app/src/auth/private-content";
import MentorLayout from "../packages/app/src/app/mentor/layout";
const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));
test("protected request recovery removes private forms on 401, retains denial/outage, and unregisters on unmount", async () => {
  const dom = new JSDOM("<div id='root'></div>");
  for (const [key, value] of Object.entries({ window: dom.window, document: dom.window.document, Event: dom.window.Event, IS_REACT_ACT_ENVIRONMENT: true })) vi.stubGlobal(key, value);
  const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
  const root = createRoot(dom.window.document.getElementById("root")!); const host = dom.window.document.getElementById("root")!;
  const fail = (code: string, status: number) => new Response(JSON.stringify({ ok: false, error: { code, message: "Safe failure" } }), { status });
  try {
    await act(async () => root.render(<MentorLayout><form><label>Private draft<input defaultValue="Owned draft" /></label></form></MentorLayout>));
    for (const [code, status] of [["FORBIDDEN", 403], ["SERVICE_UNAVAILABLE", 503]] as const) {
      fetcher.mockResolvedValueOnce(fail(code, status));
      await act(async () => { const result = await protectedRequest("/api/mentors/me"); assert.equal(result.ok, false); });
      assert.ok(host.querySelector("form")); assert.equal(replace.mock.calls.length, 0);
    }
    fetcher.mockResolvedValueOnce(new Response(JSON.stringify({ ok: true, data: { id: "owned" } })));
    assert.deepEqual(await protectedRequest("/api/mentors/me"), { ok: true, data: { id: "owned" } });
    fetcher.mockResolvedValueOnce(fail("UNAUTHORIZED", 401));
    await act(async () => { await protectedRequest("/api/mentors/me", { method: "PUT", body: "{}" }); });
    assert.equal(host.querySelector("form"), null); assert.match(host.textContent!, /Your session has expired/); assert.deepEqual(replace.mock.calls.at(-1), ["/login?reason=session-expired"]);
    await act(async () => root.render(<PrivateContent key="new-session"><p>New private content</p></PrivateContent>));
    assert.match(host.textContent!, /New private content/);
  } finally { await act(async () => root.unmount()); dom.window.close(); vi.unstubAllGlobals(); }
});
