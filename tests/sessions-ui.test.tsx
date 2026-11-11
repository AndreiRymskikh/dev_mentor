import { test, expect, vi } from "vitest";
import { act, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { JSDOM } from "jsdom";
import type { BookingDto } from "@devmentor/core/validators/bookings";
import { SessionsPanel } from "../packages/app/src/app/(auth)/account/sessions";
import { PrivateContent } from "../packages/app/src/auth/private-content";
const replace = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));
const now = "2026-11-11T12:00:00.000Z", start = "2026-11-12T12:00:00.000Z", end = "2026-11-12T12:25:00.000Z";
const row: BookingDto = { id: "11111111-1111-4111-8111-111111111111", counterpart: { displayName: "Real mentor" }, viewerRole: "developer", startsAt: start, endsAt: end, durationMinutes: 25, priceCents: 9000, currency: "PLN", status: "booked", version: 1, createdAt: now, cancelledAt: null, completedAt: null, retentionExpiresAt: "2027-05-12T12:25:00.000Z", serverNow: now, allowedActions: { cancel: true, reschedule: true, complete: false }, handoff: null };
const page = (items: BookingDto[] = [row], nextCursor: string | null = null, serverNow = now) => ({ items, nextCursor, serverNow });
const ok = (data: unknown) => Response.json({ ok: true, data });
const failure = (code = "SERVICE_UNAVAILABLE") => Response.json({ ok: false, error: { code, message: code === "UNAUTHORIZED" ? "Sign in again" : "Sessions unavailable" } }, { status: code === "UNAUTHORIZED" ? 401 : 503 });
async function mount(element: ReactNode = <SessionsPanel/>) {
  const dom = new JSDOM("<button id='outside'>Elsewhere</button><div id='root'></div>", { url: "https://local.test/account" });
  for (const [name, value] of Object.entries({ window: dom.window, document: dom.window.document, navigator: dom.window.navigator, Event: dom.window.Event, HTMLElement: dom.window.HTMLElement, Node: dom.window.Node, IS_REACT_ACT_ENVIRONMENT: true })) vi.stubGlobal(name, value);
  const host = document.getElementById("root")!, root = createRoot(host);
  await act(async () => root.render(element));
  return { dom, host, async click(name: string) { const b = [...host.querySelectorAll("button")].find(b => b.textContent === name); expect(b, host.textContent ?? "").toBeDefined(); await act(async () => b!.click()); }, async visible(value = true) { Object.defineProperty(document, "visibilityState", { value: value ? "visible" : "hidden", configurable: true }); await act(async () => document.dispatchEvent(new dom.window.Event("visibilitychange"))); }, async close() { await act(async () => root.unmount()); dom.window.close(); vi.unstubAllGlobals(); vi.useRealTimers(); } };
}
test("participant terms, roles and truthful lifecycle labels use private detail links", async () => {
  const rows = [row, { ...row, id: "mentor", counterpart: { displayName: "Developer" }, viewerRole: "mentor" as const, endsAt: now, allowedActions: { cancel: true, reschedule: false, complete: false } }, { ...row, id: "past", endsAt: now, allowedActions: { cancel: true, reschedule: false, complete: true } }, { ...row, id: "completed", status: "completed", allowedActions: { cancel: false, reschedule: false, complete: false } }, { ...row, id: "cancelled", status: "cancelled", durationMinutes: 50 }];
  vi.stubGlobal("fetch", vi.fn(async () => ok(page(rows)))); const v = await mount();
  for (const text of ["Real mentor", "You are the developer", "You are the mentor", "PLN 90.00", "25 minutes", "50 minutes", "UTC", "Booked", "Awaiting your confirmation", "Awaiting developer confirmation", "Developer-confirmed service received", "Cancelled", "Cancel with a private reason", "Reschedule.", "Confirm service received.", "payment is not verified"]) expect(v.host.textContent).toContain(text);
  expect(v.host.querySelectorAll("tbody tr")).toHaveLength(5); expect(v.host.querySelector('a[data-booking]')!.getAttribute("href")).toBe(`/account/bookings/${row.id}`);
  expect(v.host.querySelector("form")).toBeNull(); await v.close();
});
test("bounded cursor pages replace rows, restart on view/refresh and show distinct authoritative empty views", async () => {
  let data = page([row], "upcoming|time|id"); const fetcher = vi.fn<(...args: [string, RequestInit?]) => Promise<Response>>(async () => ok(data)); vi.stubGlobal("fetch", fetcher); const v = await mount();
  expect(fetcher.mock.calls[0][0]).toBe("/api/bookings?view=upcoming&limit=25");
  data = page([{ ...row, id: "second", counterpart: { displayName: "Second" } }]); await v.click("Next sessions"); expect(fetcher.mock.calls.at(-1)?.[0]).toContain("after=upcoming%7Ctime%7Cid"); expect(v.host.textContent).not.toContain("Real mentor"); expect(v.host.querySelectorAll("tbody tr")).toHaveLength(1);
  data = page([], "unused"); await v.click("Refresh sessions"); expect(fetcher.mock.calls.at(-1)?.[0]).not.toContain("after="); expect(v.host.textContent).toContain("No upcoming sessions yet"); expect(v.host.querySelector('a[href="/mentors"]')).not.toBeNull();
  await v.click("History"); expect(fetcher.mock.calls.at(-1)?.[0]).toBe("/api/bookings?view=history&limit=25"); expect(v.host.textContent).toContain("No session history yet"); expect(v.host.textContent).toContain("Completed, cancelled and ended sessions");
  data = page([row], "history|time|id"); await v.click("Refresh sessions"); await v.click("Next sessions"); await v.click("First page"); expect(fetcher.mock.calls.at(-1)?.[0]).not.toContain("after=");
  await v.click("Next sessions"); data = page([]); await v.visible(); // background refresh restarts page one
  expect(fetcher.mock.calls.at(-1)?.[0]).not.toContain("after=");
  data = page([row], "history|time|id"); await v.click("Refresh sessions"); data = page([]); await v.click("Next sessions"); expect(v.host.textContent).toContain("No more sessions in this view"); await v.click("First page"); expect(v.host.textContent).toContain("No session history yet"); await v.click("Upcoming"); expect(v.host.textContent).toContain("No upcoming sessions yet"); await v.close();
});
test("loading and outage never render old records or successful empty states; retry recovers", async () => {
  let finish!: (response: Response) => void; const fetcher = vi.fn<(...args: [string, RequestInit?]) => Promise<Response>>().mockImplementationOnce(() => new Promise(resolve => { finish = resolve; })); vi.stubGlobal("fetch", fetcher);
  const v = await mount(); expect(v.host.textContent).toContain("Loading"); expect(v.host.textContent).not.toContain("No upcoming sessions"); await act(async () => finish(failure())); expect(v.host.textContent).toContain("Sessions unavailable"); expect(v.host.textContent).not.toContain("No upcoming sessions"); fetcher.mockResolvedValue(ok(page())); await v.click("Try again"); expect(v.host.textContent).toContain("Real mentor");
  fetcher.mockResolvedValue(failure()); await v.click("Refresh sessions"); expect(v.host.textContent).not.toContain("Real mentor"); expect(v.host.textContent).toContain("Sessions unavailable"); await v.close();
});
test("old responses are aborted across views and session expiry clears protected content", async () => {
  let finish!: (response: Response) => void; const fetcher = vi.fn<(...args: [string, RequestInit?]) => Promise<Response>>().mockImplementationOnce(() => new Promise(resolve => { finish = resolve; })).mockResolvedValue(ok(page([]))); vi.stubGlobal("fetch", fetcher); const v = await mount(); await v.click("History"); expect(fetcher.mock.calls[0][1]?.signal?.aborted).toBe(true); await act(async () => finish(ok(page()))); expect(v.host.textContent).not.toContain("Real mentor"); expect(v.host.textContent).toContain("No session history yet"); await v.close();
  vi.stubGlobal("fetch", vi.fn(async () => failure("UNAUTHORIZED"))); const expired = await mount(<PrivateContent><SessionsPanel/></PrivateContent>); await act(async () => {}); expect(expired.host.textContent).toContain("Your session has expired"); expect(expired.host.textContent).not.toContain("Your bookings"); expect(replace).toHaveBeenCalledWith("/login?reason=session-expired"); await expired.close();
});
test("visibility, minute and server-relative end timers re-read without trusting device time", async () => {
  vi.useFakeTimers(); vi.setSystemTime(new Date("2035-01-01"));
  let data = page([{ ...row, endsAt: "2026-11-11T12:00:01.000Z" }]); const fetcher = vi.fn<(...args: [string, RequestInit?]) => Promise<Response>>(async () => ok(data)); vi.stubGlobal("fetch", fetcher); const v = await mount(); const initial = fetcher.mock.calls.length;
  await v.visible(false); expect(fetcher).toHaveBeenCalledTimes(initial); await act(async () => { await vi.advanceTimersByTimeAsync(1000); }); expect(fetcher).toHaveBeenCalledTimes(initial);
  data = page([{ ...row, endsAt: now }]); await act(async () => { await vi.advanceTimersByTimeAsync(1); }); expect(fetcher).toHaveBeenCalledTimes(initial + 1); expect(v.host.textContent).toContain("Awaiting your confirmation"); await act(async () => { await vi.advanceTimersByTimeAsync(60_000); }); expect(fetcher.mock.calls.length).toBeGreaterThan(initial + 1); await v.visible(); await v.close();
});
test("background refresh restores the same row link or heading while respecting deliberate focus movement", async () => {
  let data = page(); let response: Promise<Response> | null = null; const fetcher = vi.fn(async () => response ?? ok(data)); vi.stubGlobal("fetch", fetcher); const v = await mount(); const link = () => v.host.querySelector<HTMLAnchorElement>("a[data-booking]")!;
  await act(async () => link().focus()); await v.visible(); expect(document.activeElement).toBe(link());
  await act(async () => link().focus()); data = page([]); await v.visible(); expect(document.activeElement).toBe(v.host.querySelector("h2"));
  data = page(); await v.click("Refresh sessions"); await act(async () => link().focus()); let finish!: (response: Response) => void; response = new Promise(resolve => { finish = resolve; }); await v.visible(); const outside = document.getElementById("outside")!; await act(async () => outside.focus()); await act(async () => finish(ok(page()))); expect(document.activeElement).toBe(outside);
  response = null; await act(async () => link().focus()); response = Promise.resolve(failure()); await v.visible(); expect(document.activeElement).toBe(v.host.querySelector("h2")); await v.close();
});
