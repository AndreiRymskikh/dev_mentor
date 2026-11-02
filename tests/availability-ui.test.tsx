import {test,expect,vi} from "vitest";
import {act,type ReactNode} from "react";
import {createRoot} from "react-dom/client";
import {renderToStaticMarkup} from "react-dom/server";
import {JSDOM} from "jsdom";
import {SlotEditor,SlotForm} from "../packages/app/src/app/mentor/slots/slot-editor";
import SlotsPage,{dynamic,metadata} from "../packages/app/src/app/mentor/slots/page";
import {PublicSlots} from "../packages/app/src/app/m/[slug]/public-availability";
import {SessionService} from "../packages/core/src/services/users/session.service";
import type {OwnerAvailability} from "@devmentor/core/validators/availability";
vi.mock("next/headers",()=>({headers:async()=>new Headers()}));
vi.mock("next/navigation",()=>({redirect:(url:string)=>{throw new Error("redirect:"+url);}}));
const empty:OwnerAvailability={serverNow:"2026-11-02T12:00:00.000Z",refreshAt:null,slots:[],lastPublishedAvailabilityAt:null,availabilityComplete:false,policy:{publicationMonths:6,eligibilityLeadHours:2,latestPublishAt:"2027-05-02T12:00:00.000Z"}},rich={...empty,availabilityComplete:true,lastPublishedAvailabilityAt:empty.serverNow,slots:[{id:"future",startsAt:"2026-12-01T14:30:00.000Z",eligible:true},{id:"soon",startsAt:"2026-11-02T13:00:00.000Z",eligible:false},{id:"past",startsAt:"2026-11-01T12:00:00.000Z",eligible:false}]};
async function mount(element:ReactNode){
 const dom=new JSDOM("<div id='root'></div>",{url:"https://local.test"});
 for(const [name,value]of Object.entries({window:dom.window,document:dom.window.document,navigator:dom.window.navigator,FormData:dom.window.FormData,Event:dom.window.Event,HTMLElement:dom.window.HTMLElement,Node:dom.window.Node,IS_REACT_ACT_ENVIRONMENT:true}))vi.stubGlobal(name,value);
 const host=dom.window.document.getElementById("root")!,root=createRoot(host);await act(async()=>root.render(element));
 return {dom,host,root,fill(value:string){host.querySelector<HTMLInputElement>('[name="startsAt"]')!.value=value;},async click(label:string){const button=Array.from(host.querySelectorAll("button")).find(button=>button.textContent===label);expect(button).toBeDefined();await act(async()=>button!.click());},async close(){await act(async()=>root.unmount());dom.window.close();vi.unstubAllGlobals();}};
}
test("slots page checks current session/role before rendering private consumer",async()=>{
 expect(dynamic).toBe("force-dynamic");expect(metadata.robots.index).toBe(false);
 const resolve=vi.spyOn(SessionService.prototype,"resolve").mockResolvedValue(null);await expect(SlotsPage()).rejects.toThrow("redirect:/login");resolve.mockResolvedValue({id:"actor",displayName:"User",roles:["developer"]});expect(renderToStaticMarkup(await SlotsPage())).toContain("Mentor access is required");resolve.mockResolvedValue({id:"actor",displayName:"User",roles:["mentor"]});expect(renderToStaticMarkup(await SlotsPage())).toContain("Your availability");
});
test("UTC publication validates input, handles failure, duplicate pending submissions and reloads only after success",async()=>{
 const fetcher=vi.fn(),reload=vi.fn();vi.stubGlobal("fetch",fetcher);const view=await mount(<SlotForm data={empty} reload={reload}/>);
 expect(view.host.textContent).toContain("incomplete");view.fill("bad");await view.click("Publish start");expect(fetcher).not.toHaveBeenCalled();
 view.fill("2026-12-01T14:30");fetcher.mockResolvedValueOnce(Response.json({ok:false,error:{code:"CONFLICT",message:"Already published"}},{status:409}));await view.click("Publish start");expect(view.host.textContent).toContain("Already published");expect(reload).not.toHaveBeenCalled();
 let complete!:(value:Response)=>void;fetcher.mockImplementationOnce(()=>new Promise<Response>(resolve=>{complete=resolve;}));await view.click("Publish start");expect(view.host.querySelector("fieldset")!.disabled).toBe(true);await view.click("Saving…");expect(fetcher).toHaveBeenCalledTimes(2);await act(async()=>complete(Response.json({ok:true,data:empty})));expect(JSON.parse(fetcher.mock.calls[1][1].body)).toEqual({startsAt:"2026-12-01T14:30:00.000Z"});expect(reload).toHaveBeenCalledTimes(1);await view.click("Cancel");expect(reload).toHaveBeenCalledTimes(2);await view.close();
});
test("owner table shows past only on request, current eligibility and historical timestamp; removal failure retries safely",async()=>{
 const fetcher=vi.fn().mockResolvedValueOnce(Response.json({ok:false,error:{code:"OFFLINE",message:"Removal failed"}},{status:503})).mockResolvedValueOnce(Response.json({ok:true,data:empty}));vi.stubGlobal("fetch",fetcher);const reload=vi.fn(),view=await mount(<SlotForm data={rich} reload={reload}/>);
 expect(view.host.textContent).toContain("checklist: complete");expect(view.host.querySelectorAll("tbody tr")).toHaveLength(2);expect(view.host.textContent).toContain("Last publication");
 await act(async()=>view.host.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click());expect(view.host.querySelectorAll("tbody tr")).toHaveLength(3);
 await view.click("Remove");expect(view.host.textContent).toContain("Removal failed");expect(reload).not.toHaveBeenCalled();await view.click("Remove");expect(reload).toHaveBeenCalledTimes(1);expect(fetcher.mock.calls[0][0]).toBe("/api/availability/future");await view.close();
});
test("owner resource clears stale content on load failure and supports retry",async()=>{
 const fetcher=vi.fn().mockResolvedValueOnce(Response.json({ok:false,error:{code:"OFFLINE",message:"Try later"}},{status:503})).mockResolvedValueOnce(Response.json({ok:true,data:empty}));vi.stubGlobal("fetch",fetcher);const view=await mount(<SlotEditor/>);expect(view.host.textContent).toContain("Try later");await view.click("Try again");expect(view.host.textContent).toContain("Publish start");await view.close();
});
test("public availability handles load/error/retry/empty/eligibility; reloads on time boundaries and visibility",async()=>{
 const payload={...rich,refreshAt:"2026-11-02T12:00:00.010Z",slots:[{...rich.slots[0],startsAt:"2026-11-02T14:00:00.009Z"},rich.slots[1]]},expired={...payload,serverNow:"2026-11-02T12:00:00.011Z",refreshAt:null,slots:payload.slots.map(slot=>({...slot,eligible:false}))},fetcher=vi.fn().mockResolvedValueOnce(Response.json({ok:false,error:{code:"OFFLINE",message:"Unavailable"}},{status:503})).mockResolvedValueOnce(Response.json({ok:true,data:empty})).mockResolvedValueOnce(Response.json({ok:true,data:payload})).mockImplementation(async()=>Response.json({ok:true,data:expired}));vi.stubGlobal("fetch",fetcher);
 const view=await mount(<PublicSlots slug="mentor"/>);expect(view.host.textContent).toContain("Unavailable");await view.click("Try again");expect(view.host.textContent).toContain("No future starts");Object.defineProperty(view.dom.window.document,"visibilityState",{configurable:true,value:"hidden"});await act(async()=>view.dom.window.document.dispatchEvent(new view.dom.window.Event("visibilitychange")));expect(fetcher).toHaveBeenCalledTimes(2);
 Object.defineProperty(view.dom.window.document,"visibilityState",{configurable:true,value:"visible"});await act(async()=>view.dom.window.document.dispatchEvent(new view.dom.window.Event("visibilitychange")));expect(view.host.textContent).toContain("Unavailable: less than two hours ahead");expect(view.host.querySelector('[aria-disabled="true"]')).not.toBeNull();expect(view.host.querySelector('[aria-disabled="false"]')).not.toBeNull();
 await act(async()=>new Promise(resolve=>setTimeout(resolve,20)));expect(fetcher.mock.calls.length).toBeGreaterThan(3);expect(view.host.textContent).not.toContain("At least two hours ahead");expect(view.host.textContent).toContain("Unavailable: less than two hours ahead");await view.close();
});
test("resource displays loading while the authoritative response is pending",async()=>{
 let complete!:(response:Response)=>void;vi.stubGlobal("fetch",vi.fn(()=>new Promise<Response>(resolve=>{complete=resolve;})));const view=await mount(<PublicSlots slug="mentor"/>);expect(view.host.textContent).toContain("Loading");await act(async()=>complete(Response.json({ok:true,data:empty})));expect(view.host.textContent).toContain("No future starts");await view.close();
});

test("the same UTC start renders across the Warsaw DST transition without changing its instant",async()=>{
 const {formatInstant}=await import("../packages/ui/src/time/LocalTime");
 expect(formatInstant("2027-03-28T00:30:00.000Z","UTC")).toBe("28 Mar 2027, 00:30");
 expect(formatInstant("2027-03-28T00:30:00.000Z","Europe/Warsaw")).toBe("28 Mar 2027, 01:30");
 expect(formatInstant("2027-03-28T01:30:00.000Z","Europe/Warsaw")).toBe("28 Mar 2027, 03:30");
});
