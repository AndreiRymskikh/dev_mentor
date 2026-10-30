import assert from "node:assert/strict";
import { test, vi } from "vitest";
import { StrictMode, act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { JSDOM } from "jsdom";
import { ActionForm } from "../packages/app/src/app/(auth)/action-form";
import VerifyPage from "../packages/app/src/app/(auth)/verify-email/page";
import ResetPage from "../packages/app/src/app/(auth)/reset-password/page";
import AccountPage from "../packages/app/src/app/(auth)/account/page";
import { LogoutButton } from "../packages/app/src/app/(auth)/account/logout-button";
const { cookie, resolve, scope, redirect } = vi.hoisted(() => ({ cookie: vi.fn(), resolve: vi.fn(), scope: vi.fn(), redirect: vi.fn(() => { throw new Error("REDIRECT"); }) }));
vi.mock("next/headers", () => ({ headers: cookie }));
vi.mock("next/navigation", () => ({ redirect, useRouter: () => ({ replace: vi.fn() }) }));
vi.mock("@devmentor/core/container", () => ({ withScope: scope }));
const token = "a".repeat(43);
async function mount(mode: "verify" | "reset" | "logout", suffix = `?discard=yes#token=${token}`, stripFailure = false) {
  const dom = new JSDOM("<div id='root'></div>", { url: `http://localhost/${mode === "verify" ? "verify-email" : "reset-password"}${suffix}` });
  dom.window.history.replaceState({ retained: true }, "");
  if (stripFailure) vi.spyOn(dom.window.history, "replaceState").mockImplementation(() => { throw new Error("blocked"); });
  for (const [name, value] of Object.entries({ window: dom.window, document: dom.window.document, FormData: dom.window.FormData, IS_REACT_ACT_ENVIRONMENT: true })) vi.stubGlobal(name, value);
  const host = dom.window.document.getElementById("root")!; const root = createRoot(host);
  await act(async () => root.render(<StrictMode>{mode === "logout" ? <LogoutButton /> : <ActionForm mode={mode} />}</StrictMode>));
  return { host, dom,
    async submit(index = 0) { await act(async () => host.querySelectorAll("form")[index].dispatchEvent(new dom.window.Event("submit", { bubbles: true, cancelable: true }))); },
    async click() { await act(async () => host.querySelector("button")!.click()); },
    async close() { await act(async () => root.unmount()); dom.window.close(); vi.unstubAllGlobals(); },
  };
}
function response(ok = true, fieldErrors?: Record<string, string[]>) { return new Response(JSON.stringify(ok ? { ok: true, data: {} } : { ok: false, error: { code: "VALIDATION_ERROR", message: "bad token", ...(fieldErrors ? { fieldErrors } : {}) } }), { status: ok ? 200 : 400 }); }
test("token pages server-render no token or consuming GET form", () => {
  for (const Page of [VerifyPage, ResetPage]) { const html = renderToStaticMarkup(<Page />); assert.doesNotMatch(html, new RegExp(token)); assert.match(html, /Open the link from your email/); }
});
test("verification strips query/hash preserving framework history and requires explicit POST; duplicates blocked and success offers login", async () => {
  let finish: (response: Response) => void = () => {}; const fetcher = vi.fn(() => new Promise<Response>((resolve) => { finish = resolve; })); vi.stubGlobal("fetch", fetcher);
  const view = await mount("verify");
  try {
    assert.equal(view.dom.window.location.href, "http://localhost/verify-email"); assert.deepEqual(view.dom.window.history.state, { retained: true }); assert.equal(fetcher.mock.calls.length, 0); assert.doesNotMatch(view.host.innerHTML, new RegExp(token));
    await view.submit(); await view.submit(); assert.equal(fetcher.mock.calls.length, 1); assert.equal(view.host.querySelector("fieldset")!.disabled, true);
    const [url, options] = fetcher.mock.calls[0] as unknown as [string, RequestInit]; assert.equal(url, "/api/auth/verification/confirm"); assert.equal(options.method, "POST"); assert.deepEqual(JSON.parse(String(options.body)), { token });
    await act(async () => finish(response())); assert.match(view.host.textContent!, /Email verified/); assert.equal(view.host.querySelector('a[href="/login"]')?.textContent, "Sign in"); assert.equal(view.host.querySelector("form"), null);
  } finally { await view.close(); }
});
test("missing, malformed, duplicate, unexpected and query-only fragments fail closed; strip failure prevents using token", async () => {
  const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
  for (const suffix of ["", "?token=" + token, "#token=short", `#token=${token}&token=${token}`, `#token=${token}&other=x`, "#other=x"]) {
    const view = await mount("reset", suffix); try { assert.match(view.host.textContent!, /Open the link/); assert.equal(view.host.querySelector("form"), null); assert.equal(view.dom.window.location.href, "http://localhost/reset-password"); } finally { await view.close(); }
  }
  const view = await mount("verify", `#token=${token}`, true); try { assert.match(view.host.textContent!, /Open the link/); assert.doesNotMatch(view.host.innerHTML, new RegExp(token)); } finally { await view.close(); }
  assert.equal(fetcher.mock.calls.length, 0);
});
test("reset validates new password, focuses errors and permits safe retry before login-only success", async () => {
  const fetcher = vi.fn().mockResolvedValueOnce(response(false)).mockResolvedValueOnce(response()); vi.stubGlobal("fetch", fetcher);
  const view = await mount("reset");
  try {
    const password = view.host.querySelector<HTMLInputElement>('[name="newPassword"]')!; assert.equal(password.autocomplete, "new-password"); password.value = "short"; await view.submit(); assert.equal(fetcher.mock.calls.length, 0); assert.equal(view.dom.window.document.activeElement, password);
    password.value = "new safe password"; await view.submit(); assert.match(view.host.textContent!, /invalid, expired or already used/); assert.doesNotMatch(view.host.innerHTML, /bad token/);
    await view.submit(); assert.match(view.host.textContent!, /Password changed/); assert.equal(view.host.querySelector("form"), null);
    const [url, options] = fetcher.mock.calls[0] as unknown as [string, RequestInit]; assert.equal(url, "/api/auth/password/reset"); assert.deepEqual(JSON.parse(String(options.body)), { token, newPassword: "new safe password" });
  } finally { await view.close(); }
});
test("verification resend validates, reports safe failure/server field errors and generic success", async () => {
  const fetcher = vi.fn().mockResolvedValueOnce(response(false, { email: ["Invalid email"] })).mockResolvedValueOnce(response(false)).mockResolvedValueOnce(response()); vi.stubGlobal("fetch", fetcher);
  const view = await mount("verify", "");
  try {
    await view.submit(); assert.match(view.host.textContent!, /Please correct/); assert.equal(fetcher.mock.calls.length, 0);
    view.host.querySelector<HTMLInputElement>('[name="email"]')!.value = "some@example.test"; await view.submit(); assert.match(view.host.textContent!, /Invalid email/); assert.equal(view.dom.window.document.activeElement?.getAttribute("name"), "email");
    await view.submit(); await view.submit(); assert.match(view.host.textContent!, /If this address has an eligible account/); assert.equal(fetcher.mock.calls[0][0], "/api/auth/verification/request");
    await view.submit(); assert.doesNotMatch(view.host.textContent!, /If this address has an eligible account/);
  } finally { await view.close(); }
});
test("action errors distinguish validation, network and service outages without echoing a token", async () => {
  const fetcher = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(new Response(JSON.stringify({ ok: false, error: { code: "SERVICE_UNAVAILABLE", message: "Service temporarily unavailable" } }), { status: 503 })); vi.stubGlobal("fetch", fetcher);
  const view = await mount("verify");
  try { await view.submit(); assert.match(view.host.textContent!, /Unable to reach the server/); assert.doesNotMatch(view.host.textContent!, /invalid, expired/); await view.submit(); assert.match(view.host.textContent!, /Service temporarily unavailable/); assert.doesNotMatch(view.host.innerHTML, new RegExp(token)); } finally { await view.close(); }
});
test("account resolves once through scoped service, shows all roles, fails closed and offers outage retry", async () => {
  scope.mockImplementation((run: (value: unknown) => unknown) => run({ sessionService: { resolve } }));
  cookie.mockResolvedValue(new Headers({ cookie: "devmentor-session=opaque" })); resolve.mockResolvedValue({ id: "user-id", displayName: "Test Member", roles: ["developer", "mentor", "administrator"] });
  const html = renderToStaticMarkup(await AccountPage()); assert.match(html, /Test Member/); for (const role of ["Mentee", "Mentor", "Operator"]) assert.match(html, new RegExp(role)); assert.doesNotMatch(html, /opaque|user-id/); assert.deepEqual(resolve.mock.calls.at(-1), ["opaque"]);
  for (const value of ["", "devmentor-session=a; devmentor-session=b"]) { cookie.mockResolvedValue(new Headers({ cookie: value })); resolve.mockResolvedValue(null); await assert.rejects(AccountPage(), /REDIRECT/); assert.deepEqual(resolve.mock.calls.at(-1), [null]); }
  cookie.mockResolvedValue(new Headers({ cookie: "devmentor-session=invalid" })); await assert.rejects(AccountPage(), /REDIRECT/); assert.deepEqual(redirect.mock.calls.at(-1), ["/login"]);
  resolve.mockRejectedValue(new Error("secret database detail")); const outage = renderToStaticMarkup(await AccountPage()); assert.match(outage, /Account temporarily unavailable/); assert.match(outage, /href="\/account"/); assert.doesNotMatch(outage, /secret database detail/);
});
test("logout uses bodyless CSRF POST, blocks duplicates, shows failure retry and fixed full navigation", async () => {
  let finish: (response: Response) => void = () => {}; const fetcher = vi.fn(() => new Promise<Response>((resolve) => { finish = resolve; })); vi.stubGlobal("fetch", fetcher);
  const view = await mount("logout");
  try {
    await view.click(); await view.click(); assert.equal(fetcher.mock.calls.length, 1); await act(async () => finish(response(false))); assert.match(view.host.textContent!, /Unable to sign out/);
    // Replace only the browser boundary, preserving a real React event/submission lifecycle.
    const replace = vi.fn(); vi.stubGlobal("window", { location: { replace } }); await view.click(); await act(async () => finish(response())); assert.deepEqual(replace.mock.calls, [["/login"]]);
    const [url, options] = fetcher.mock.calls[0] as unknown as [string, RequestInit]; assert.equal(url, "/api/auth/logout"); assert.equal(options.body, undefined); assert.equal(new Headers(options.headers).get("X-DevMentor-CSRF"), "1");
  } finally { await view.close(); }
});
