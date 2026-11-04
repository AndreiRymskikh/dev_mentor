import { test, expect, vi } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { JSDOM } from "jsdom";
import { MentorHome } from "../packages/app/src/app/mentor/mentor-home";
import MentorPage, { dynamic, metadata } from "../packages/app/src/app/mentor/page";
import { SessionService } from "../packages/core/src/services/users/session.service";
import { InvitationService } from "../packages/core/src/services/invitations/invitation.service";
import type { OwnerPrices } from "@devmentor/core/validators/prices";
import type { OwnerAvailability } from "@devmentor/core/validators/availability";
import type { OwnerMentorProfile } from "@devmentor/core/validators/mentors";
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw new Error("redirect:" + url); }, useRouter: () => ({replace: vi.fn()}) }));
const prices: OwnerPrices = { currency: "PLN", priceBounds: { p25: { minCents: 9000, maxCents: 60000 }, p50: { minCents: 18000, maxCents: 120000 } }, prices: null, savedPrices: { price25Cents: null, price50Cents: null }, readiness: { profile: false, prices: false, availability: false }, mentorOfferReady: false, bookingAvailable: false, serverNow: "2026-11-04T12:00:00.000Z", refreshAt: null };
const slots: OwnerAvailability = { slots: [], nextCursor: null, serverNow: prices.serverNow, refreshAt: null, availabilityComplete: false, lastPublishedAvailabilityAt: null, policy: { publicationMonths: 6, eligibilityLeadHours: 2, latestPublishAt: "2027-05-04T12:00:00.000Z" } };
const profile: OwnerMentorProfile = { displayName: "Actual mentor", publicWorkUrl: null, bio: null, stackTags: [], slug: null, publishedAt: null, readiness: [] };
const ok = (data: unknown) => Response.json({ ok: true, data });
const fail = (code = "OFFLINE", message = "Load failed") => Response.json({ ok: false, error: { code, message } }, {status:503});
async function mount() {
 const dom = new JSDOM("<div id='root'></div>", {url:"https://local.test"});
 for (const [name, value] of Object.entries({ window: dom.window, document: dom.window.document, navigator: dom.window.navigator, FormData: dom.window.FormData, Event: dom.window.Event, HTMLElement: dom.window.HTMLElement, Node: dom.window.Node, IS_REACT_ACT_ENVIRONMENT: true })) vi.stubGlobal(name, value);
 Object.defineProperties(dom.window.HTMLElement.prototype, {attachEvent:{value:()=>undefined},detachEvent:{value:()=>undefined}});
 const host = dom.window.document.getElementById("root")!, root = createRoot(host);
 await act(async () => root.render(<MentorHome initialPublishDueAt={null}/>));
 return { dom, host, fill(name: string, value: string) { host.querySelector<HTMLInputElement>(`[name=${name}]`)!.value = value; }, async click(label: string) { const button = Array.from(host.querySelectorAll("button")).find(button => button.textContent === label); expect(button).toBeDefined(); await act(async () => button!.click()); }, async refresh(visible = true) { Object.defineProperty(dom.window.document, "visibilityState", {value:visible ? "visible" : "hidden", configurable:true}); await act(async () => dom.window.document.dispatchEvent(new dom.window.Event("visibilitychange"))); }, async close() { await act(async () => root.unmount()); dom.window.close(); vi.unstubAllGlobals(); } };
}
function transport(state: {offer?: OwnerPrices; profile?: OwnerMentorProfile; slots?: OwnerAvailability} = {}) {
 return vi.fn(async (url: string) => ok(url === "/api/mentors/me/prices" ? state.offer ?? prices : url === "/api/mentors/me" ? state.profile ?? profile : state.slots ?? slots));
}
test("mentor server page fails safely and retains identity/deadline without loading parallel domain services", async () => {
 expect(dynamic).toBe("force-dynamic"); expect(metadata.robots).toEqual({index:false,follow:false});
 const resolve = vi.spyOn(SessionService.prototype,"resolve").mockRejectedValueOnce(new Error("private"));
 let html = renderToStaticMarkup(await MentorPage()); expect(html).toContain("temporarily unavailable"); expect(html).not.toContain("private");
 resolve.mockResolvedValue({id:"actor",displayName:"Actual mentor",roles:["mentor"]});
 const onboarding = vi.spyOn(InvitationService.prototype,"onboarding").mockRejectedValueOnce(new Error("private"));
 html = renderToStaticMarkup(await MentorPage()); expect(html).toContain("Try again");
 onboarding.mockResolvedValue({initialPublishDueAt: "2026-11-09T12:00:00.000Z"});
 html = renderToStaticMarkup(await MentorPage()); expect(html).toContain("Signed in as"); expect(html).toContain("Actual mentor"); expect(html).toContain("Initial publication deadline"); expect(html).toContain("2026-11-09T12:00:00.000Z");
});
test("0/1/2/3 server states drive progress and share visibility, without implying launched booking", async () => {
 for (const count of [0,1,2,3]) {
  const state = {offer:{...prices,readiness:{profile:count>0,prices:count>1,availability:count>2},mentorOfferReady:count===3},profile:{...profile,publishedAt:count ? prices.serverNow : null,slug:count ? "real-mentor" : null}};
  vi.stubGlobal("fetch",transport(state)); const view = await mount();
  expect(view.host.textContent).toContain(`${count} of 3 steps complete`); expect(view.host.querySelector("progress")!.value).toBe(count);
  expect(view.host.querySelector('a[href="/m/real-mentor"]') !== null).toBe(count>0);
  expect(view.host.textContent!.includes("Your profile is ready to share")).toBe(count===3);
  expect(view.host.textContent).toContain("Booking and cancellation are not available yet"); expect(view.host.querySelector('a[href*=payout]')).toBeNull(); expect(view.host.querySelectorAll("form")).toHaveLength(2);
  expect(view.host.textContent).toContain("No results"); await view.close();
 }
});
test("readiness and profile failures/loading hide stale share/readiness; retries and visibility refresh keep drafts", async () => {
 const state = {offer:{...prices,readiness:{profile:true,prices:true,availability:true},mentorOfferReady:true},profile:{...profile,publishedAt:prices.serverNow,slug:"real"}};
 const fetcher = transport(state); vi.stubGlobal("fetch",fetcher); const view = await mount();
 view.fill("price25","111.11");view.fill("startsAt","2026-12-01T14:30");const input=view.host.querySelector<HTMLInputElement>('[name=price25]')!;input.focus();
 await view.refresh(false);expect(fetcher).toHaveBeenCalledTimes(4);
 let finish!:(response:Response)=>void;let reads=0;fetcher.mockImplementation(async (url:string)=>url==="/api/mentors/me/prices" && ++reads===2 ? new Promise<Response>(resolve=>{finish=resolve;}) : ok(url==="/api/mentors/me/prices"?state.offer:url==="/api/mentors/me"?state.profile:slots));
 await view.refresh();expect(view.host.textContent).toContain("Checking mentor setup");expect(view.host.textContent).not.toContain("3 of 3");expect(view.host.querySelector('a[href="/m/real"]')).toBeNull();expect(view.host.querySelector('[name=price25]')).toBe(input);expect(view.dom.window.document.activeElement).toBe(input);
 await act(async()=>finish(fail()));expect(view.host.textContent).toContain("Load failed");
 fetcher.mockImplementation(async (url:string)=>ok(url==="/api/mentors/me/prices"?state.offer:url==="/api/mentors/me"?state.profile:slots));
 await view.click("Try again");expect(view.host.textContent).toContain("3 of 3 steps complete");
 fetcher.mockImplementation(async (url:string)=>url==="/api/mentors/me"?fail():ok(url==="/api/mentors/me/prices"?state.offer:slots));await view.refresh();expect(view.host.querySelector('a[href="/m/real"]')).toBeNull();
 fetcher.mockImplementation(async (url:string)=>ok(url==="/api/mentors/me"?state.profile:url==="/api/mentors/me/prices"?state.offer:slots));await view.click("Try again");expect(view.host.querySelector('a[href="/m/real"]')).not.toBeNull();expect(input.value).toBe("111.11");expect(view.host.querySelector<HTMLInputElement>('[name=startsAt]')!.value).toBe("2026-12-01T14:30");await view.close();
});
test("saved prices and slot publication/removal recheck authoritative progress, preserving other drafts and UTC", async () => {
 const state = {offer:prices,slots};const fetcher=transport(state);vi.stubGlobal("fetch",fetcher);const view=await mount();view.fill("startsAt","2026-12-01T14:30");view.fill("price25","90");view.fill("price50","180");
 state.offer={...prices,readiness:{profile:false,prices:true,availability:false}};
 await view.click("Save both prices");expect(view.host.textContent).toContain("1 of 3 steps complete");expect(view.host.querySelector<HTMLInputElement>('[name=startsAt]')!.value).toBe("2026-12-01T14:30");
 state.offer={...state.offer,readiness:{profile:false,prices:true,availability:true}};state.slots={...slots,slots:[{id:"start",startsAt:"2026-12-01T14:30:00.000Z",eligible:true}],availabilityComplete:true};
 await view.click("Publish start");expect(view.host.textContent).toContain("2 of 3 steps complete");expect(view.host.textContent).toContain("2026-12-01 14:30 UTC");
 const mutation=fetcher.mock.calls.find(call=>call[0]==="/api/availability/slots");expect(mutation).toBeDefined();
 state.offer={...state.offer,readiness:{profile:false,prices:true,availability:false}};state.slots=slots;await view.click("Remove");expect(view.host.textContent).toContain("1 of 3 steps complete");expect(view.host.textContent).toContain("Start removed");await view.close();
});
test("any live denial removes every home form, table and public link; aborted stale denial cannot erase newer data", async () => {
 for (const code of ["FORBIDDEN","UNAUTHORIZED"]) {
  let finish!:(response:Response)=>void;const fetcher=transport();fetcher.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));vi.stubGlobal("fetch",fetcher);const view=await mount();await view.refresh();await act(async()=>finish(fail(code)));expect(view.host.querySelectorAll("form")).toHaveLength(2);
  fetcher.mockImplementation(async()=>fail(code));await view.click("Save both prices"); // Empty validation does not send a mutation.
  await view.refresh();expect(view.host.querySelector("form")).toBeNull();expect(view.host.querySelector("table")).toBeNull();expect(view.host.querySelector("a")).toBeNull();expect(view.host.textContent).toContain("Mentor access is required");await view.close();
 }
});
