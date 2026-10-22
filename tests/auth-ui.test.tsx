import assert from "node:assert/strict";
import { test, vi } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { JSDOM } from "jsdom";
import { AuthForm } from "../packages/app/src/app/(auth)/auth-form";
import RegisterPage from "../packages/app/src/app/(auth)/register/page";
import LoginPage from "../packages/app/src/app/(auth)/login/page";
import ForgotPage from "../packages/app/src/app/(auth)/forgot-password/page";
import AuthLayout from "../packages/app/src/app/(auth)/layout";

const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

async function mount(mode: "register" | "login" | "forgot") {
  const dom = new JSDOM("<div id='root'></div>", { url: "http://localhost" });
  for (const [name, value] of Object.entries({ window: dom.window, document: dom.window.document, FormData: dom.window.FormData, IS_REACT_ACT_ENVIRONMENT: true })) vi.stubGlobal(name, value);
  const host = dom.window.document.getElementById("root")!;
  const root = createRoot(host);
  await act(async () => { root.render(<AuthForm mode={mode} />); });
  return { host, dom,
    fill(name: string, value: string) { host.querySelector<HTMLInputElement>(`[name="${name}"]`)!.value = value; },
    async submit() { await act(async () => { host.querySelector("form")!.dispatchEvent(new dom.window.Event("submit", { bubbles: true, cancelable: true })); }); },
    async key(key: string, options: KeyboardEventInit = {}) { await act(async () => { host.querySelector("form")!.dispatchEvent(new dom.window.KeyboardEvent("keydown", { bubbles: true, key, ...options })); }); },
    async close() { await act(async () => root.unmount()); dom.window.close(); vi.unstubAllGlobals(); },
  };
}
function response(data: unknown, status = 200) { return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } }); }
test("auth pages compose a labelled native form in the auth frame", () => {
  for (const Page of [RegisterPage, LoginPage, ForgotPage]) {
    const html = renderToStaticMarkup(<AuthLayout><Page /></AuthLayout>);
    assert.match(html, /<main/); assert.match(html, /<h1/); assert.match(html, /Email address/); assert.match(html, /autocomplete="email"/i); assert.match(html, /required=""/);
  }
});
test("registration validates and focuses fields, prevents duplicate submissions, gives generic success and clears stale success", async () => {
  let finish: ((value: Response) => void) | undefined;
  const fetcher = vi.fn(() => new Promise<Response>((resolve) => { finish = resolve; }));
  vi.stubGlobal("fetch", fetcher);
  const view = await mount("register");
  try {
    await view.submit(); assert.equal(fetcher.mock.calls.length, 0);
    assert.equal(view.dom.window.document.activeElement?.getAttribute("name"), "displayName");
    assert.ok(view.host.querySelector('[name="displayName"]')?.getAttribute("aria-describedby"));
    view.fill("displayName", "Alice"); view.fill("email", " Alice@Example.test "); view.fill("password", "safe password value");
    await view.key("x"); await view.key("Enter");
    await view.key("Enter", { ctrlKey: true }); await view.submit();
    assert.equal(fetcher.mock.calls.length, 1); assert.equal(view.host.querySelector("fieldset")!.disabled, true);
    assert.equal(view.host.querySelector("form")!.getAttribute("aria-busy"), "true");
    await act(async () => { finish!(response({ ok: true, data: { message: "generic" } }, 202)); });
    assert.match(view.host.textContent!, /If this address can be registered/);
    assert.equal(view.host.querySelector('a[href="/verify-email"]')?.textContent, "Need another verification email?");
    view.fill("password", "short"); await view.submit();
    assert.doesNotMatch(view.host.textContent!, /If this address can be registered/);
    assert.equal(view.dom.window.document.activeElement?.getAttribute("name"), "password");
    const [url, options] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    assert.equal(url, "/api/auth/register"); assert.deepEqual(JSON.parse(String(options.body)), { displayName: "Alice", email: "alice@example.test", password: "safe password value" });
    assert.equal(new Headers(options.headers).get("X-DevMentor-CSRF"), "1");
    assert.equal(view.host.querySelector('[name="password"]')?.getAttribute("autocomplete"), "new-password");
  } finally { await view.close(); }
});
test("login shows safe server field/root/rate/network failures, GitHub feedback and fixed successful destination", async () => {
  const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
  const view = await mount("login");
  try {
    view.fill("email", "a@example.test"); view.fill("password", "wrong");
    fetcher.mockResolvedValueOnce(response({ ok: false, error: { code: "VALIDATION_ERROR", message: "Invalid input", fieldErrors: { email: ["Check email"], _form: ["Unable to continue"] } } }, 400));
    await view.submit(); assert.match(view.host.textContent!, /Check email/); assert.match(view.host.textContent!, /Unable to continue/);
    assert.equal(view.dom.window.document.activeElement?.getAttribute("name"), "email");
    fetcher.mockResolvedValueOnce(response({ ok: false, error: { code: "RATE_LIMIT", message: "Too many requests" } }, 429));
    await view.submit(); assert.match(view.host.textContent!, /Please wait before trying again/);
    fetcher.mockRejectedValueOnce(new Error("offline")); await view.submit(); assert.match(view.host.textContent!, /Unable to reach the server/);
    fetcher.mockResolvedValueOnce(response({ ok: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } }, 401));
    await view.submit(); assert.match(view.host.textContent!, /Unable to sign in. Check your email and password/);
    fetcher.mockResolvedValueOnce(response({ ok: false, error: { code: "UNAVAILABLE", message: "Service unavailable" } }, 503));
    await view.submit(); assert.match(view.host.textContent!, /Service unavailable/);
    await act(async () => { [...view.host.querySelectorAll("button")].find((button) => button.textContent === "Continue with GitHub")!.click(); });
    assert.match(view.host.textContent!, /GitHub sign-in will be implemented soon/);
    assert.equal(fetcher.mock.calls.length, 5);
    fetcher.mockResolvedValueOnce(response({ ok: true, data: { id: "safe" } }));
    await view.key("Enter", { metaKey: true }); assert.deepEqual(replace.mock.calls.at(-1), ["/account"]);
    assert.equal(view.host.querySelector('[name="password"]')?.getAttribute("autocomplete"), "current-password");
  } finally { await view.close(); }
});
test("forgot form has only an email field and generic success", async () => {
  const fetcher = vi.fn().mockResolvedValue(response({ ok: true, data: {} }, 202)); vi.stubGlobal("fetch", fetcher);
  const view = await mount("forgot");
  try {
    assert.equal(view.host.querySelectorAll("input").length, 1); view.fill("email", "unknown@example.test"); await view.submit();
    assert.match(view.host.textContent!, /If this address has an eligible account/);
    assert.equal(fetcher.mock.calls[0][0], "/api/auth/password/forgot");
    assert.doesNotMatch(view.host.textContent!, /Continue with GitHub/);
  } finally { await view.close(); }
});
