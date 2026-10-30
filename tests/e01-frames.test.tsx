import assert from "node:assert/strict";
import { test, vi } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { JSDOM } from "jsdom";
import { WorkspaceFrame, AuthFrame } from "../packages/ui/src/backend/frames";
import { AuthForm } from "../packages/app/src/app/(auth)/auth-form";
import OperatorPage from "../packages/app/src/app/admin/workspace/page";
const { scope, headers, resolve, list, replace, refresh } = vi.hoisted(() => ({ scope: vi.fn(), headers: vi.fn(), resolve: vi.fn(), list: vi.fn(), replace: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace, refresh }), redirect: () => { throw new Error("REDIRECT"); } }));
vi.mock("next/headers", () => ({ headers }));
vi.mock("@devmentor/core/container", () => ({ withScope: scope }));
test("auth frame supplies one main landmark, outside brand and footer", () => {
  const html = renderToStaticMarkup(<AuthFrame><h1>Welcome</h1></AuthFrame>);
  assert.match(html, /dm-auth-card/); assert.match(html, /Text mentoring for developers/);
  assert.ok(html.indexOf('dm-brand') < html.indexOf('dm-auth-card'));
});
test("workspace navigation is additive, current, honest and keyboard dismissible", async () => {
  const dom = new JSDOM("<div id='root'></div>");
  for (const [key, value] of Object.entries({ window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true })) vi.stubGlobal(key, value);
  const host = dom.window.document.getElementById("root")!; const root = createRoot(host);
  try {
    for (const roles of [["developer"], ["mentor"], ["administrator"], ["developer", "mentor", "administrator"]]) {
      await act(async () => root.render(<WorkspaceFrame identity="Current member" roles={roles} current="account" signOut={<button>Sign out</button>}><h1>My sessions</h1></WorkspaceFrame>));
      assert.equal(Boolean(host.querySelector('a[href="/mentor"]')), roles.includes("mentor"));
      assert.equal(Boolean(host.querySelector('a[href="/admin/workspace"]')), roles.includes("administrator"));
      assert.match(host.querySelector('[aria-current="page"]')!.textContent!, /My sessions/);
      assert.equal(host.querySelector('a[href*="catalog"]'), null);
      const trigger = host.querySelector<HTMLButtonElement>('[aria-label="Open navigation"]')!;
      await act(async () => { host.querySelector(".dm-workspace")!.dispatchEvent(new dom.window.KeyboardEvent("keydown", { bubbles: true, key: "Escape" })); trigger.click(); });
      assert.equal(trigger.getAttribute("aria-expanded"), "true");
      await act(async () => host.querySelector(".dm-workspace")!.dispatchEvent(new dom.window.KeyboardEvent("keydown", { bubbles: true, key: "x" })));
      assert.equal(trigger.getAttribute("aria-expanded"), "true");
      await act(async () => host.querySelector(".dm-workspace")!.dispatchEvent(new dom.window.KeyboardEvent("keydown", { bubbles: true, key: "Escape" })));
      assert.equal(trigger.getAttribute("aria-expanded"), "false"); assert.equal(dom.window.document.activeElement, trigger);
      await act(async () => trigger.click());
      await act(async () => host.querySelector<HTMLButtonElement>('[aria-label="Close navigation"]')!.click());
      assert.equal(trigger.getAttribute("aria-expanded"), "false");
      await act(async () => trigger.click());
      await act(async () => host.querySelector<HTMLAnchorElement>('a[href="/account"]')!.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true, cancelable: true })));
      assert.equal(trigger.getAttribute("aria-expanded"), "false");
    }
  } finally { await act(async () => root.unmount()); dom.window.close(); vi.unstubAllGlobals(); }
});
test("expired reason only displays login feedback and never prepopulates credentials", async () => {
  const dom = new JSDOM("<div id='root'></div>", { url: "http://localhost/login?reason=session-expired" });
  for (const [key, value] of Object.entries({ window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true })) vi.stubGlobal(key, value);
  const host = dom.window.document.getElementById("root")!; const root = createRoot(host);
  try {
    await act(async () => root.render(<AuthForm mode="login" />));
    assert.match(host.textContent!, /Your session has expired/); assert.match(host.textContent!, /Sign in again to continue/);
    assert.equal(host.querySelector<HTMLInputElement>('[name="email"]')!.value, ""); assert.equal(replace.mock.calls.length, 0);
    await act(async () => { dom.window.history.replaceState(null, "", "/login?reason=arbitrary"); dom.window.dispatchEvent(new dom.window.PopStateEvent("popstate")); });
    assert.doesNotMatch(host.textContent!, /Your session has expired/);
    await act(async () => { dom.window.history.replaceState(null, "", "/register?reason=session-expired"); dom.window.dispatchEvent(new dom.window.PopStateEvent("popstate")); root.render(<AuthForm mode="register" />); });
    assert.doesNotMatch(host.textContent!, /Your session has expired/);
  } finally { await act(async () => root.unmount()); dom.window.close(); vi.unstubAllGlobals(); }
});
test("operator home uses the shared current-membership server guard", async () => {
  scope.mockImplementation((run: (value: unknown) => unknown) => run({ sessionService: { resolve }, adminUsersService: { list } }));
  headers.mockResolvedValue(new Headers()); list.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 });
  resolve.mockResolvedValue({ id: "id", displayName: "Current operator", roles: ["developer", "administrator"] });
  const html = renderToStaticMarkup(await OperatorPage()); assert.match(html, /Operator workspace/); assert.match(html, /View users/); assert.match(html, /Only administrators/); assert.match(html, /Current operator/);
  resolve.mockResolvedValue(null); await assert.rejects(OperatorPage(), /REDIRECT/);
  resolve.mockResolvedValue({ id: "id", roles: ["developer"] }); assert.match(renderToStaticMarkup(await OperatorPage()), /Access denied/);
});
