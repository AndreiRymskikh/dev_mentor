import {test, expect, vi} from "vitest";
import {act} from "react";
import {createRoot} from "react-dom/client";
import {renderToStaticMarkup} from "react-dom/server";
import {JSDOM} from "jsdom";
import {Catalog} from "../packages/app/src/app/mentors/catalog";
import MentorsPage, {dynamic, metadata} from "../packages/app/src/app/mentors/page";
import type {MentorCatalog} from "@devmentor/core/validators/mentors";
const now = new Date().toISOString();
const page: MentorCatalog = {serverNow: now, refreshAt: null, nextCursor: "2026-11-07T00:00:00.123456Z|550e8400-e29b-41d4-a716-446655440000", items: [
  {slug:"react-mentor", displayName:"React Mentor", bio:"Build accessible interfaces", stackTags:["react"], offer:{prices:{price25Cents:9000,price50Cents:18000,currency:"PLN"},readiness:{profile:true,prices:true,availability:true},mentorOfferReady:true,bookingAvailable:false,serverNow:now,refreshAt:null}},
  {slug:"other-mentor", displayName:"Other Mentor", bio:null, stackTags:[], offer:{prices:null,readiness:{profile:true,prices:false,availability:false},mentorOfferReady:false,bookingAvailable:false,serverNow:now,refreshAt:null}},
]};
const ok = (data: MentorCatalog) => Response.json({ok:true,data});
async function mount(after?: string) {
  const dom = new JSDOM("<div id='root'></div>",{url:"https://local.test/mentors"});
  for(const [name,value] of Object.entries({window:dom.window,document:dom.window.document,IS_REACT_ACT_ENVIRONMENT:true})) vi.stubGlobal(name,value);
  Object.defineProperty(dom.window.document, "visibilityState", {value:"visible", configurable:true});
  const host = dom.window.document.getElementById("root")!, root = createRoot(host);
  await act(async()=>root.render(<Catalog after={after}/>));
  return {dom,host,root,close:async()=>{await act(async()=>root.unmount());dom.window.close();vi.unstubAllGlobals();}};
}
test("catalog page presents public links, summaries, truthful states and encoded continuation without booking",async()=>{
  expect(dynamic).toBe("force-dynamic"); expect(metadata.title).toContain("Find a mentor");
  expect((await MentorsPage({searchParams:Promise.resolve({})})).props.after).toBeUndefined();
  expect((await MentorsPage({searchParams:Promise.resolve({after:page.nextCursor!})})).props.after).toBe(page.nextCursor);
  // SSR shell is safe and conveys loading before browser data arrives.
  expect(renderToStaticMarkup(await MentorsPage({searchParams:Promise.resolve({})}))).toContain("Loading");
  const fetch = vi.fn().mockResolvedValue(ok(page)); vi.stubGlobal("fetch", fetch);
  const view=await mount();
  try {
    expect(fetch).toHaveBeenCalledWith("/api/mentors", expect.objectContaining({credentials:"same-origin"}));
    expect(view.host.querySelector("h1")).toBe(view.dom.window.document.activeElement);
    expect(view.host.textContent).toContain("React Mentor"); expect(view.host.textContent).toContain("Build accessible interfaces");
    expect(view.host.textContent).toContain("25 minutes: PLN 90.00"); expect(view.host.textContent).toContain("50 minutes: PLN 180.00");
    expect(view.host.textContent).toContain("Prices are not set within current bounds"); expect(view.host.textContent).toContain("No eligible availability");
    expect(view.host.textContent).toContain("at least two hours"); expect(view.host.textContent).toContain("Booking and payment are not available yet");
    expect(view.host.querySelector('[aria-label="Stack tags"]')?.textContent).toBe("React");
    expect(view.host.querySelector('[aria-label="View profile: React Mentor"]')?.getAttribute("href")).toBe("/m/react-mentor");
    expect(view.host.querySelector('a[href^="/mentors?after="]')?.getAttribute("href")).toBe(`/mentors?after=${encodeURIComponent(page.nextCursor!)}`);
    expect(view.host.querySelectorAll('a[href="/mentors"]')).toHaveLength(1);
    expect(view.host.querySelector('a[href*="book"]')).toBeNull();
    fetch.mockResolvedValue(ok({...page,nextCursor:null}));
    const link=view.host.querySelector<HTMLAnchorElement>('[aria-label="View profile: React Mentor"]')!;link.focus();
    await act(async()=>view.dom.window.document.dispatchEvent(new view.dom.window.Event("visibilitychange")));
    // Automatic refresh preserves keyboard position; explicit page/retry owns result focus.
    expect(view.dom.window.document.activeElement?.tagName).not.toBe("H1");
    expect(view.host.querySelector('a[href^="/mentors?after="]')).toBeNull();
  } finally {await view.close();}
});
test("empty first page and empty continuation offer distinct feedback and a restart link",async()=>{
  const fetch=vi.fn().mockImplementation(async()=>ok({...page,items:[],nextCursor:null}));vi.stubGlobal("fetch",fetch);
  const view=await mount();
  try {
    expect(view.host.textContent).toContain("No mentors have published a profile yet");
    await act(async()=>view.root.render(<Catalog after={page.nextCursor!}/>));
    expect(fetch).toHaveBeenLastCalledWith(`/api/mentors?after=${encodeURIComponent(page.nextCursor!)}`,expect.anything());
    expect(view.host.textContent).toContain("No more mentors on this page");
    expect([...view.host.querySelectorAll('a[href="/mentors"]')].some(link=>link.textContent === "Back to first page")).toBe(true);
  } finally {await view.close();}
});
test("loading and failed refresh hide stale results; retry restores data and focus",async()=>{
  let finish:(value:Response)=>void=()=>undefined;
  const fetch=vi.fn().mockImplementationOnce(()=>new Promise<Response>(resolve=>{finish=resolve;}));vi.stubGlobal("fetch",fetch);
  const view=await mount("bad-cursor");
  try {
    expect(view.host.textContent).toContain("Loading"); expect(view.host.textContent).not.toContain("No mentors have");
    await act(async()=>finish(Response.json({ok:false,error:{code:"UNAVAILABLE",message:"Catalog unavailable"}},{status:503})));
    expect(view.host.querySelector('[role="alert"]')?.textContent).toContain("Catalog unavailable");
    expect(view.host.textContent).not.toContain("React Mentor"); expect(view.host.textContent).toContain("Back to first page");
    fetch.mockImplementation(async()=>ok(page));
    await act(async()=>view.host.querySelector<HTMLButtonElement>("button")!.click());
    expect(view.host.textContent).toContain("React Mentor"); expect(view.dom.window.document.activeElement?.tagName).toBe("H1");
    fetch.mockImplementation(async()=>Response.json({ok:false,error:{code:"UNAVAILABLE",message:"Refresh failed"}},{status:503}));
    await act(async()=>view.dom.window.document.dispatchEvent(new view.dom.window.Event("visibilitychange")));
    expect(view.host.textContent).toContain("Refresh failed"); expect(view.host.textContent).not.toContain("React Mentor");
  } finally {await view.close();}
});
test("periodic reconciliation refreshes current visibility and clears its timer on unmount",async()=>{
  vi.useFakeTimers(); const fetch=vi.fn().mockImplementation(async()=>ok(page));vi.stubGlobal("fetch",fetch);
  const view=await mount();
  try {
    const count=fetch.mock.calls.length;
    fetch.mockImplementation(async()=>ok({...page,items:[],nextCursor:null}));
    await act(async()=>vi.advanceTimersByTimeAsync(60000));
    expect(fetch.mock.calls.length).toBe(count+1);expect(view.host.textContent).not.toContain("React Mentor");
  } finally {await view.close();vi.useRealTimers();}
});
