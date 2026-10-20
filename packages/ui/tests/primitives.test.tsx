// @vitest-environment jsdom
import { afterEach, test, expect } from "vitest";
import { act, createRef } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { Button, buttonVariants } from "@devmentor/ui/components/ui/button";
import { Link } from "@devmentor/ui/components/ui/link";
import { Input } from "@devmentor/ui/components/ui/input";
import { Textarea } from "@devmentor/ui/components/ui/textarea";
import { Label } from "@devmentor/ui/components/ui/label";
import { FormField } from "@devmentor/ui/backend/fields";
import { cn } from "../src/lib/utils";

Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", {value:true,configurable:true});
let root: Root | undefined;
afterEach(async () => { if (root) await act(async () => root!.unmount()); root = undefined; document.body.replaceChildren(); });

function mountHost() { const host=document.createElement("div");document.body.append(host);root=createRoot(host);return host; }

test("semantic utilities merge classes and generated Button defaults avoid accidental form submission", () => {
  expect(cn("px-control-inline", false, ["font-sans", undefined], {"px-page-gutter":true})).toBe("font-sans px-page-gutter");
  expect(buttonVariants()).toContain("dm-button-primary dm-size-default");
  const html=renderToStaticMarkup(<Button>Request session</Button>);
  expect(html).toContain('type="button"');expect(html).toContain('data-variant="primary"');expect(html).not.toContain('aria-busy');expect(html).not.toContain('aria-describedby');
});

test("Button preserves explicit submit/reset, sizes, toggle state and custom styling", () => {
  const html=renderToStaticMarkup(<Button type="submit" variant="text" size="compact" className="context" aria-pressed="true" aria-describedby="context-help" disabled={false} loading={false}>Save availability</Button>);
  expect(html).toContain('type="submit"');expect(html).toContain("dm-button-text");expect(html).toContain("dm-size-compact context");expect(html).toContain('aria-pressed="true"');expect(html).toContain('aria-describedby="context-help"');
  expect(renderToStaticMarkup(<Button type="reset" size="icon" aria-label="Clear search">×</Button>)).toContain('type="reset"');
});

test("Button explains native disabled state and merges descriptions without leaking an irrelevant reason", () => {
  const html=renderToStaticMarkup(<Button disabled disabledReason="Select an available time first." aria-describedby="existing">Request session</Button>);
  const host=document.createElement("div");host.innerHTML=html;
  const button=host.querySelector("button")!;
  expect(button.disabled).toBe(true);const ids=button.getAttribute("aria-describedby")!.split(" ");expect(ids[0]).toBe("existing");expect(host.querySelector(`[id="${ids[1]}"]`)?.textContent).toBe("Select an available time first.");
  expect(renderToStaticMarkup(<Button disabled>Unavailable</Button>)).not.toContain("aria-describedby");
  expect(renderToStaticMarkup(<Button disabled={false} disabledReason="Not applicable">Save</Button>)).not.toContain("Not applicable");
});

test("Button blocks native activation while loading, retains its label, announces progress and forwards refs", async () => {
  const host=mountHost();let calls=0;const ref=createRef<HTMLButtonElement>();
  await act(async()=>root!.render(<Button ref={ref} onClick={()=>calls++}>Save profile</Button>));
  await act(async()=>ref.current!.click());expect(calls).toBe(1);
  await act(async()=>root!.render(<Button ref={ref} onClick={()=>calls++} loading>Save profile</Button>));
  expect(ref.current?.textContent).toBe("Save profile");expect(ref.current?.getAttribute("aria-busy")).toBe("true");expect(host.querySelector('[role="status"]')?.textContent).toBe("In progress…");
  await act(async()=>ref.current!.click());expect(calls).toBe(1);
});

test("Link uses native navigation, safe new-tab relations and rejects executable URL schemes", () => {
  expect(renderToStaticMarkup(<Link href="/forgot-password">Reset password</Link>)).toContain('href="/forgot-password"');
  const external=renderToStaticMarkup(<Link href="https://example.com/public-work" target="_blank" rel="nofollow noopener" className="context">Public work (new tab)</Link>);
  expect(external).toContain('rel="noopener noreferrer nofollow"');expect(external).toContain("dm-link dm-focus context");
  expect(renderToStaticMarkup(<Link href="#details" target="_blank">Details</Link>)).toContain('rel="noopener noreferrer"');
  expect(renderToStaticMarkup(<Link href="mailto:support@example.com" target="_self" rel="help">Contact support</Link>)).toContain('rel="help"');
  for(const href of ["javascript:alert(1)","java\nscript:alert(1)","data:text/html,test","vbscript:msgbox(1)","ftp://example.com"]) expect(()=>renderToStaticMarkup(<Link href={href}>Unsafe</Link>)).toThrow("Link requires");
  expect(()=>renderToStaticMarkup(<Link href="http://[">Invalid</Link>)).toThrow();
});

test("Input and Textarea preserve native values, constraints, read-only/disabled state and refs", async () => {
  const host=mountHost();const inputRef=createRef<HTMLInputElement>();const textareaRef=createRef<HTMLTextAreaElement>();
  await act(async()=>root!.render(<><Input ref={inputRef} aria-label="Email" defaultValue="alex@example.com" /><Textarea ref={textareaRef} aria-label="Feedback" defaultValue="The explanation helped." /></>));
  expect(inputRef.current?.type).toBe("text");expect(inputRef.current?.value).toBe("alex@example.com");expect(inputRef.current?.className).toContain("dm-size-default");expect(textareaRef.current?.value).toBe("The explanation helped.");
  await act(async()=>root!.render(<><Input type="email" density="compact" className="context" aria-label="Email" required readOnly disabled defaultValue="alex@example.com" maxLength={120} /><Textarea aria-label="Feedback" className="context" required disabled readOnly maxLength={500} defaultValue="Notes" /></>));
  const input=host.querySelector("input")!;const textarea=host.querySelector("textarea")!;
  expect(input.type).toBe("email");expect(input.className).toContain("dm-size-compact context");expect(input.required&&input.disabled&&input.readOnly).toBe(true);expect(input.maxLength).toBe(120);
  expect(textarea.required&&textarea.disabled&&textarea.readOnly).toBe(true);expect(textarea.maxLength).toBe(500);expect(textarea.className).toContain("context");
});

test("Label keeps its native association and Radix double-click protection", async () => {
  const host=mountHost();
  await act(async()=>root!.render(<><Label htmlFor="email" className="context">Email</Label><Input id="email" /></>));
  const label=host.querySelector("label")!;expect(label.htmlFor).toBe("email");expect(label.className).toBe("dm-label context");expect(label.textContent).toBe("Email");
  expect(label.dispatchEvent(new MouseEvent("mousedown",{bubbles:true,cancelable:true,detail:2}))).toBe(false);
  expect(renderToStaticMarkup(<Label htmlFor="topic">Topic</Label>)).toContain('class="dm-label"');
});

test("FormField generates linked ids, labels optional inputs and leaves validation with its owner", () => {
  const host=document.createElement("div");host.innerHTML=renderToStaticMarkup(<FormField label="Display name">{control=><Input {...control} />}</FormField>);
  const input=host.querySelector("input")!;expect(input.id).not.toBe("");expect(host.querySelector("label")?.htmlFor).toBe(input.id);expect(host.textContent).toContain("Optional");expect(input.required||input.disabled).toBe(false);expect(input.getAttribute("aria-invalid")).toBe("false");expect(input.hasAttribute("aria-describedby")).toBe(false);
});

test("FormField wires hints, required/error feedback and disabled reasons into one description", () => {
  const host=document.createElement("div");host.innerHTML=renderToStaticMarkup(<FormField id="topic" label="Your feedback" hint="Describe what helped." error="Enter feedback." required disabled disabledReason="Session completion must be recorded first.">{control=><Textarea {...control} />}</FormField>);
  const textarea=host.querySelector("textarea")!;expect(textarea.getAttribute("aria-describedby")).toBe("topic-hint topic-error topic-reason");expect(textarea.getAttribute("aria-invalid")).toBe("true");expect(textarea.disabled&&textarea.required).toBe(true);expect(host.querySelector('[role="alert"]')?.textContent).toBe("Enter feedback.");expect(host.querySelector('svg')?.getAttribute('aria-hidden')).toBe("true");expect(host.textContent).toContain("Required");
  expect(renderToStaticMarkup(<FormField label="Topic" hint="" error="" required={false} disabled={false} disabledReason="Hidden">{control=><Input {...control} />}</FormField>)).not.toContain("Hidden");
  expect(renderToStaticMarkup(<FormField label="Topic" disabled>{control=><Input {...control} />}</FormField>)).not.toContain("-reason");
});
