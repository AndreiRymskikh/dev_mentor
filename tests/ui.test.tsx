import { test } from "vitest";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { z } from "zod";
import { DataTable } from "@devmentor/ui/backend/tables";
import { CrudForm } from "@devmentor/ui/backend/forms";

const props = { rows: [{ id: "1", name: "Alice" }], columns: [{ key: "name", label: "Name", render: (row: { name: string }) => row.name }], rowKey: (row: { id: string }) => row.id };
test("table renders accessible loading/error/empty states and pagination/actions", () => {
  assert.match(renderToStaticMarkup(<DataTable {...props} loading />), /role="status"/);
  assert.match(renderToStaticMarkup(<DataTable {...props} error="Failed" />), /role="alert"/);
  assert.match(renderToStaticMarkup(<DataTable<{ id: string; name: string }> {...props} rows={[]} />), /No results/);
  const html = renderToStaticMarkup(<DataTable {...props} total={40} pageSize={20} onPageChange={() => {}} actions={() => <button>Edit</button>} />);
  assert.match(html, /Alice/); assert.match(html, /Page 1 of 2/); assert.match(html, /Edit/);
});
test("schema-driven form renders labelled fields and submit/cancel controls", () => {
  const html = renderToStaticMarkup(<CrudForm schema={z.object({ name: z.string() })} fields={[{ name: "name", label: "Name" }]} initialValues={{ name: "Alice" }} onSubmit={async () => ({ ok: true, data: null })} onCancel={() => {}} />);
  assert.match(html, /<label/); assert.match(html, /value="Alice"/); assert.match(html, /Save/); assert.match(html, /Cancel/);
});

test("form validates, displays server field errors, prevents duplicate saves and supports keyboard shortcuts", async () => {
  const { JSDOM } = await import("jsdom");
  const { createRoot } = await import("react-dom/client");
  const { act } = await import("react");
  const dom = new JSDOM("<div id='root'></div>", { url: "http://localhost" });
  const globals = { window: dom.window, document: dom.window.document, FormData: dom.window.FormData, IS_REACT_ACT_ENVIRONMENT: true };
  const previous = new Map(Object.keys(globals).map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  const host = dom.window.document.getElementById("root")!;
  const root = createRoot(host);
  let calls = 0; let cancelled = 0; let saved = 0;
  let finish: ((value: { ok: false; error: { code: string; message: string; fieldErrors: Record<string, string[]> } }) => void) | undefined;
  try {
    await act(async () => { root.render(<CrudForm schema={z.object({ name: z.string().min(3) })} fields={[{ name: "name", label: "Name" }]} onCancel={() => { cancelled++; }} onSuccess={() => { saved++; }} onSubmit={async () => {
      calls++;
      if (calls > 1) return { ok: true, data: null };
      return new Promise((resolve) => { finish = resolve; });
    }} />); });
    const form = host.querySelector("form")!;
    const input = host.querySelector("input")!;
    input.value = "a";
    await act(async () => { form.dispatchEvent(new dom.window.Event("submit", { bubbles: true, cancelable: true })); });
    assert.equal(calls, 0);
    assert.equal(input.getAttribute("aria-invalid"), "true");
    input.value = "Alice";
    await act(async () => {
      form.dispatchEvent(new dom.window.Event("submit", { bubbles: true, cancelable: true }));
      form.dispatchEvent(new dom.window.Event("submit", { bubbles: true, cancelable: true }));
    });
    assert.equal(calls, 1);
    assert.equal(host.querySelector("fieldset")!.disabled, true);
    await act(async () => { finish!({ ok: false, error: { code: "VALIDATION_ERROR", message: "Cannot save", fieldErrors: { name: ["Already taken"] } } }); });
    assert.match(host.textContent!, /Already taken/);
    assert.equal(host.querySelector("fieldset")!.disabled, false);
    await act(async () => { form.dispatchEvent(new dom.window.KeyboardEvent("keydown", { bubbles: true, key: "Escape" })); });
    assert.equal(cancelled, 1);
    await act(async () => { form.dispatchEvent(new dom.window.KeyboardEvent("keydown", { bubbles: true, key: "Enter", ctrlKey: true })); });
    assert.equal(calls, 2); assert.equal(saved, 1);
  } finally {
    await act(async () => { root.unmount(); });
    dom.window.close();
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  }
});
