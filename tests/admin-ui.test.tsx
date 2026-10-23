import assert from "node:assert/strict";
import { test, vi } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { JSDOM } from "jsdom";
import { UsersList } from "../packages/app/src/app/admin/users/users-list";
import AdminLayout from "../packages/app/src/app/admin/layout";
import AccountPage from "../packages/app/src/app/(auth)/account/page";
import * as api from "@devmentor/ui/backend/api";
import UsersPage from "../packages/app/src/app/admin/users/page";
import AdminPage from "../packages/app/src/app/admin/page";
import { MentorButton } from "../packages/app/src/app/(auth)/account/mentor-button";
import { ForbiddenError } from "@devmentor/core/http";
import type { AdminUsersPage } from "@devmentor/core/validators/users";
const { refresh, headers, scope, resolve, list, redirect } = vi.hoisted(() => ({ refresh: vi.fn(), headers: vi.fn(), scope: vi.fn(), resolve: vi.fn(), list: vi.fn(), redirect: vi.fn(() => { throw new Error("REDIRECT"); }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }), redirect }));
vi.mock("next/headers", () => ({ headers }));
vi.mock("@devmentor/core/container", () => ({ withScope: scope }));
const id = "00000000-0000-4000-8000-000000000001";
const user = { id, displayName: "Administrator", email: "admin@example.test", emailVerifiedAt: "2026-10-23T00:00:00.000Z", roles: ["developer", "administrator"] as const, createdAt: "2026-10-23T00:00:00.000Z" };
const initial: AdminUsersPage = { items: [user, { ...user, id: "00000000-0000-4000-8000-000000000002", displayName: "Other", email: "other@example.test", roles: ["developer", "mentor"], emailVerifiedAt: null }], page: 1, pageSize: 20, total: 21 };
function response(data: unknown, status = 200) { return new Response(JSON.stringify({ ok: true, data }), { status }); }
function failure(code: string, status = 503) { return new Response(JSON.stringify({ ok: false, error: { code, message: "Safe error" } }), { status }); }
async function mount(mentor = false, data = initial) {
  const dom = new JSDOM("<div id='root'></div>", { url: "http://localhost/admin/users" });
  for (const [name, value] of Object.entries({ window: dom.window, document: dom.window.document, FormData: dom.window.FormData, IS_REACT_ACT_ENVIRONMENT: true })) vi.stubGlobal(name, value);
  const host = dom.window.document.getElementById("root")!; const root = createRoot(host);
  await act(async () => root.render(mentor ? <MentorButton /> : <UsersList actorId={id} initial={data} />));
  return { host, dom,
    async submit(index = 0) { await act(async () => host.querySelectorAll("form")[index].dispatchEvent(new dom.window.Event("submit", { bubbles: true, cancelable: true }))); },
    async click(text: string) { await act(async () => [...host.querySelectorAll("button")].find(button => button.textContent === text)!.click()); },
    async close() { await act(async () => root.unmount()); dom.window.close(); vi.unstubAllGlobals(); },
  };
}
test("admin server pages resolve raw cookies once, enforce role, recheck persisted permission and fail closed", async () => {
  scope.mockImplementation((run: (value: unknown) => unknown) => run({ sessionService: { resolve }, adminUsersService: { list } }));
  headers.mockResolvedValue(new Headers({ cookie: "devmentor-session=opaque" })); resolve.mockResolvedValue({ id, roles: ["administrator"] }); list.mockResolvedValue(initial);
  assert.match(renderToStaticMarkup(<AdminLayout>Content</AdminLayout>), /dm-admin/);
  let html = renderToStaticMarkup(await UsersPage()); assert.match(html, /admin@example.test/); assert.match(html, /Users/); assert.deepEqual(resolve.mock.calls.at(-1), ["opaque"]); assert.deepEqual(list.mock.calls.at(-1), [id, {}]);
  await assert.rejects(AdminPage(), /REDIRECT/); assert.deepEqual(redirect.mock.calls.at(-1), ["/admin/users"]);
  for (const cookie of ["", "devmentor-session=a; devmentor-session=b"]) { headers.mockResolvedValue(new Headers({ cookie })); resolve.mockResolvedValue(null); await assert.rejects(UsersPage(), /REDIRECT/); assert.deepEqual(resolve.mock.calls.at(-1), [null]); assert.deepEqual(redirect.mock.calls.at(-1), ["/login"]); }
  resolve.mockResolvedValue({ id, roles: ["developer"] }); html = renderToStaticMarkup(await AdminPage()); assert.match(html, /Access denied/); assert.doesNotMatch(html, /admin@example.test/);
  resolve.mockResolvedValue({ id, roles: ["administrator"] }); list.mockRejectedValue(new ForbiddenError()); html = renderToStaticMarkup(await UsersPage()); assert.match(html, /Access denied/);
  list.mockRejectedValue(new Error("secret sql")); html = renderToStaticMarkup(await UsersPage()); assert.match(html, /Administration temporarily unavailable/); assert.doesNotMatch(html, /secret sql|admin@example.test/);
});
test("admin search normalizes and encodes, pagination/retry/empty states work", async () => {
  const fetcher = vi.fn().mockResolvedValueOnce(response({ ...initial, page: 2 })).mockResolvedValueOnce(failure("SERVICE_UNAVAILABLE")).mockResolvedValueOnce(response(initial)).mockResolvedValueOnce(response({ ...initial, items: [], page: 2 })).mockResolvedValueOnce(response({ ...initial, items: [], total: 0 })); vi.stubGlobal("fetch", fetcher);
  const view = await mount(); try {
    assert.match(view.host.textContent!, /Yes/); assert.match(view.host.textContent!, /No/); assert.match(view.host.textContent!, /Developer \(always enabled\)/);
    await view.click("Next"); assert.match(fetcher.mock.calls[0][0], /page=2/); await view.click("Previous"); assert.match(view.host.textContent!, /Safe error/); await view.click("Try again");
    view.host.querySelector<HTMLInputElement>('[name="q"]')!.value = " Foo+BAR "; await view.submit(); assert.match(fetcher.mock.calls[3][0], /page=1&pageSize=20&q=foo%2Bbar/); assert.match(view.host.textContent!, /Previous page/); await view.click("Previous page"); assert.match(view.host.textContent!, /No results/);
  } finally { await view.close(); }
});
test("admin mutations prevent duplicate submissions and handle conflicts, failures and updates", async () => {
  let finish: (value: Response) => void = () => {};
  const fetcher = vi.fn().mockImplementationOnce(() => new Promise<Response>(resolve => { finish = resolve; })).mockResolvedValueOnce(failure("SERVICE_UNAVAILABLE")).mockResolvedValueOnce(response({ roles: ["developer", "mentor"] })).mockResolvedValueOnce(response(initial)); vi.stubGlobal("fetch", fetcher);
  const view = await mount(); try {
    await view.submit(1); await view.submit(1); assert.equal(fetcher.mock.calls.length, 1); assert.equal(view.host.querySelector("fieldset")!.disabled, true);
    await act(async () => finish(failure("CONFLICT", 409))); assert.match(view.host.textContent!, /last verified administrator/);
    await view.submit(2); assert.match(view.host.textContent!, /Safe error/);
    await view.submit(2); assert.match(view.host.textContent!, /Roles updated/);
    const [path, options] = fetcher.mock.calls[2] as unknown as [string, RequestInit]; assert.match(path, /000002\/roles$/); assert.deepEqual(JSON.parse(String(options.body)), { mentor: true, administrator: false }); assert.equal(options.method, "PUT");
  } finally { await view.close(); }
});
test("admin search races and unmount aborts cannot overwrite current results", async () => {
  let old: (value: Response) => void = () => {}; const fetcher = vi.fn().mockImplementationOnce(() => new Promise<Response>(resolve => { old = resolve; })).mockResolvedValueOnce(response({ ...initial, items: [{ ...user, displayName: "Current result" }] })); vi.stubGlobal("fetch", fetcher);
  const view = await mount(); try {
    await view.submit(); await view.submit(); await act(async () => old(response({ ...initial, items: [{ ...user, displayName: "Stale result" }] }))); assert.match(view.host.textContent!, /Current result/); assert.doesNotMatch(view.host.textContent!, /Stale result/);
    fetcher.mockImplementationOnce((_path: string, options: RequestInit) => new Promise<Response>((_resolve, reject) => options.signal!.addEventListener("abort", () => reject(new Error("aborted"))))); await view.submit();
  } finally { await view.close(); }
});
test("admin removes private DOM on expired/denied access and self-demotion", async () => {
  for (const code of ["UNAUTHORIZED", "FORBIDDEN"]) {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(failure(code, code === "UNAUTHORIZED" ? 401 : 403))); const view = await mount();
    try { await view.submit(); assert.doesNotMatch(view.host.textContent!, /admin@example.test/); assert.match(view.host.textContent!, /Access changed/); } finally { await view.close(); }
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(failure(code, code === "UNAUTHORIZED" ? 401 : 403))); const mutationView = await mount(); try { await mutationView.submit(1); assert.doesNotMatch(mutationView.host.textContent!, /admin@example.test/); } finally { await mutationView.close(); }
  }
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({ roles: ["developer"] }))); const view = await mount(); try { view.host.querySelector<HTMLInputElement>('input[name="administrator"]')!.checked = false; await view.submit(1); assert.match(view.host.textContent!, /Access changed/); assert.doesNotMatch(view.host.textContent!, /admin@example.test/); assert.ok(refresh.mock.calls.length); } finally { await view.close(); }
});
test("mentor enrollment posts fixed empty payload, blocks duplicates and refreshes current roles", async () => {
  let finish: (value: Response) => void = () => {}; const fetcher = vi.fn().mockImplementationOnce(() => new Promise<Response>(resolve => { finish = resolve; })).mockResolvedValueOnce(response({ roles: ["developer", "mentor"] })); vi.stubGlobal("fetch", fetcher); const view = await mount(true);
  try { await view.click("Become a mentor"); await view.click("Become a mentor"); assert.equal(fetcher.mock.calls.length, 1); await act(async () => finish(failure("SERVICE_UNAVAILABLE"))); assert.match(view.host.textContent!, /Safe error/); await view.click("Become a mentor"); assert.equal(fetcher.mock.calls[1][0], "/api/users/me/mentor"); assert.equal(fetcher.mock.calls[1][1].body, "{}"); assert.ok(refresh.mock.calls.length); } finally { await view.close(); }
});

test("account exposes mentor action and administrator navigation only for current memberships", async () => {
  scope.mockImplementation((run: (value: unknown) => unknown) => run({ sessionService: { resolve } })); headers.mockResolvedValue(new Headers());
  resolve.mockResolvedValue({ id, displayName: "Member", roles: ["developer"] }); let html = renderToStaticMarkup(await AccountPage()); assert.match(html, /Become a mentor/); assert.doesNotMatch(html, /Manage users/);
  resolve.mockResolvedValue({ id, displayName: "Member", roles: ["developer", "mentor", "administrator"] }); html = renderToStaticMarkup(await AccountPage()); assert.match(html, /Manage users/); assert.doesNotMatch(html, /Become a mentor/);
});
test("unexpected list failure has a retry and delayed query cannot restore self-demoted private data", async () => {
  const mocked = vi.spyOn(api, "apiCall").mockRejectedValueOnce(new Error("unexpected")); const view = await mount();
  try { await view.submit(); assert.match(view.host.textContent!, /Unable to load users/); } finally { await view.close(); mocked.mockRestore(); }
  let finishMutation: (value: Response) => void = () => {}; let finishQuery: (value: Response) => void = () => {};
  vi.stubGlobal("fetch", vi.fn().mockImplementationOnce(() => new Promise<Response>(resolve => { finishMutation = resolve; })).mockImplementationOnce(() => new Promise<Response>(resolve => { finishQuery = resolve; })));
  const raced = await mount(); try {
    raced.host.querySelector<HTMLInputElement>('input[name="administrator"]')!.checked = false;
    await raced.submit(1); await raced.submit();
    await act(async () => finishMutation(response({ roles: ["developer"] })));
    await act(async () => finishQuery(response(initial)));
    assert.doesNotMatch(raced.host.textContent!, /admin@example.test/); assert.match(raced.host.textContent!, /Access changed/);
  } finally { await raced.close(); }
});
