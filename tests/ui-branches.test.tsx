import { test, vi } from "vitest";
import assert from "node:assert/strict";
import { act, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { JSDOM } from "jsdom";
import { z } from "zod";
import { CrudForm } from "@devmentor/ui/backend/forms";
import { DataTable } from "@devmentor/ui/backend/tables";
import { ErrorMessage, EmptyState, LoadingMessage } from "@devmentor/ui/backend/feedback";
import { renderToStaticMarkup } from "react-dom/server";

async function mount(content: ReactNode) {
  const dom = new JSDOM("<div id='root'></div>", { url: "http://localhost" });
  for (const [name, value] of Object.entries({ window: dom.window, document: dom.window.document, FormData: dom.window.FormData, IS_REACT_ACT_ENVIRONMENT: true })) vi.stubGlobal(name, value);
  const host = dom.window.document.getElementById("root")!;
  const root = createRoot(host);
  await act(async () => { root.render(content); });
  return { host, dom,
    submit: async () => { await act(async () => { host.querySelector("form")!.dispatchEvent(new dom.window.Event("submit", { bubbles: true, cancelable: true })); }); },
    click: async (text: string) => { await act(async () => { [...host.querySelectorAll("button")].find((button) => button.textContent === text)!.click(); }); },
    key: async (key: string, options: KeyboardEventInit = {}) => { await act(async () => { host.querySelector("form")!.dispatchEvent(new dom.window.KeyboardEvent("keydown", { bubbles: true, key, ...options })); }); },
    dispose: async () => { await act(async () => root.unmount()); dom.window.close(); vi.unstubAllGlobals(); },
  };
}
test("table pagination invokes page callbacks and feedback retries are usable", async () => {
  const pages: number[] = [];
  const view = await mount(<DataTable rows={[{ id: "1" }]} columns={[{ key: "id", label: "ID", render: (row) => row.id }]} rowKey={(row) => row.id} page={2} pageSize={1} total={3} onPageChange={(page) => pages.push(page)} />);
  try { await view.click("Previous"); await view.click("Next"); assert.deepEqual(pages, [1, 3]); }
  finally { await view.dispose(); }
  let retried = false;
  const error = await mount(<ErrorMessage message="Failed" onRetry={() => { retried = true; }} />);
  try { await error.click("Try again"); assert.equal(retried, true); }
  finally { await error.dispose(); }
  assert.match(renderToStaticMarkup(<EmptyState message="Custom empty" />), /Custom empty/);
  assert.match(renderToStaticMarkup(<LoadingMessage message="Custom loading" />), /Custom loading/);
});
test("form handles numbers, checkboxes, root validation and optional success callbacks", async () => {
  const schema = z.object({ age: z.number().optional(), enabled: z.boolean(), disabled: z.boolean() });
  let submitted: unknown;
  const view = await mount(<CrudForm schema={schema} fields={[{ name: "age", label: "Age", type: "number" }, { name: "enabled", label: "Enabled", type: "checkbox" }, { name: "disabled", label: "Disabled", type: "checkbox" }]} initialValues={{ age: 2, enabled: true, disabled: false }} onSubmit={async (value) => { submitted = value; return { ok: true, data: null }; }} onCancel={() => {}} />);
  try {
    await view.key("x"); await view.key("Enter");
    await view.submit(); assert.deepEqual(submitted, { age: 2, enabled: true, disabled: false });
    view.host.querySelector<HTMLInputElement>('[name="age"]')!.value = "";
    await view.key("Enter", { metaKey: true }); assert.deepEqual(submitted, { age: undefined, enabled: true, disabled: false });
  } finally { await view.dispose(); }
  const rootSchema = z.object({ name: z.string() }).refine(() => false, { message: "Root validation failed" });
  const root = await mount(<CrudForm schema={rootSchema} fields={[{ name: "name", label: "Name" }]} onSubmit={async () => { throw new Error("must not run"); }} onCancel={() => {}} />);
  try { await root.submit(); assert.match(root.host.textContent!, /Root validation failed/); }
  finally { await root.dispose(); }
});
test("form shows network/server failures and ignores escape while saving", async () => {
  const schema = z.object({ name: z.string().min(3).regex(/^X/) });
  const view = await mount(<CrudForm schema={schema} fields={[{ name: "name", label: "Name", type: "text" }]} onSubmit={async () => { throw new Error("offline"); }} onCancel={() => {}} />);
  try {
    view.host.querySelector("input")!.value = "a";
    await view.submit(); assert.match(view.host.textContent!, /Invalid string/);
    view.host.querySelector("input")!.value = "Xname";
    await view.submit(); assert.match(view.host.textContent!, /Unable to save/);
  } finally { await view.dispose(); }
  let cancelled = 0;
  let finish: (() => void) | undefined;
  const saving = await mount(<CrudForm schema={z.object({ name: z.string() })} fields={[{ name: "name", label: "Name" }]} onSubmit={() => new Promise((resolve) => { finish = () => resolve({ ok: false, error: { code: "BAD", message: "Server failure" } }); })} onCancel={() => { cancelled++; }} />);
  try {
    await saving.submit(); await saving.key("Escape"); assert.equal(cancelled, 0);
    await act(async () => { finish!(); }); assert.match(saving.host.textContent!, /Server failure/);
    await saving.click("Cancel"); assert.equal(cancelled, 1);
  } finally { await saving.dispose(); }
});
