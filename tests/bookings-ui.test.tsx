import {test,expect,vi} from "vitest";
import {act,type ReactNode} from "react";
import {createRoot} from "react-dom/client";
import {renderToStaticMarkup} from "react-dom/server";
import {JSDOM} from "jsdom";
import {randomUUID} from "node:crypto";
import {BookingReview} from "../packages/app/src/app/book/[mentorSlug]/review";
import BookPage,{dynamic as bookDynamic,metadata as bookMeta} from "../packages/app/src/app/book/[mentorSlug]/page";
import BookingPage,{dynamic,metadata} from "../packages/app/src/app/(auth)/account/bookings/[id]/page";
import {BookingDetailPanel} from "../packages/app/src/app/(auth)/account/bookings/[id]/detail";
import {BookingOptionsPanel} from "../packages/app/src/bookings/booking-options";
import {BookingTime} from "../packages/app/src/bookings/booking-times";
import {useBookingCommand} from "../packages/app/src/bookings/use-booking-command";
import {parseBookingReturn} from "../packages/app/src/auth/booking-return";
import {readInvitationReturn} from "../packages/app/src/auth/invitation-return";
import type {BookingOptions,BookingDetail} from "@devmentor/core/validators/bookings";
const router=vi.hoisted(()=>({push:vi.fn(),replace:vi.fn()}));vi.mock("next/navigation",()=>({useRouter:()=>router}));
const id=randomUUID(),slot=randomUUID(),now="2026-08-31T12:00:00.000Z",start="2026-09-01T14:00:00.000Z",end="2026-09-01T14:25:00.000Z";
const options:BookingOptions={mentorName:"Mentor",bookingAvailable:true,unavailableReason:null,prices:{price25Cents:1000,price50Cents:2000},handoff:{guidance:"Contact mentor externally",supportUrl:"https://example.test/support"},slots:[{id:slot,startsAt:start,bookable:true,reason:null}],nextCursor:null,serverNow:now,refreshAt:null};
const detail:BookingDetail={booking:{id,counterpart:{displayName:"Mentor",mentorSlug:"mentor"},viewerRole:"developer",startsAt:start,endsAt:end,durationMinutes:25,priceCents:1000,currency:"PLN",status:"booked",version:1,createdAt:now,cancelledAt:null,completedAt:null,retentionExpiresAt:"2027-03-01T14:25:00.000Z",serverNow:now,allowedActions:{cancel:true,reschedule:true,complete:false},handoff:options.handoff},events:[{kind:"created",version:1,actorRole:"developer",actorName:"Developer",occurredAt:now,reason:null,oldStartsAt:null,newStartsAt:null}],nextCursor:null};
const ok=(data:unknown)=>Response.json({ok:true,data}),fail=(code="CONFLICT",message="Changed")=>Response.json({ok:false,error:{code,message}},{status:code==="UNAUTHORIZED"?401:409});
async function mount(element:ReactNode,url="https://local.test") {
 const dom=new JSDOM("<div id='root'></div>",{url});
 for(const [name,value]of Object.entries({window:dom.window,document:dom.window.document,navigator:dom.window.navigator,FormData:dom.window.FormData,Event:dom.window.Event,HTMLElement:dom.window.HTMLElement,Node:dom.window.Node,sessionStorage:dom.window.sessionStorage,IS_REACT_ACT_ENVIRONMENT:true}))vi.stubGlobal(name,value);
 Object.defineProperties(dom.window.HTMLElement.prototype,{attachEvent:{value:()=>undefined},detachEvent:{value:()=>undefined}});
 Object.defineProperties(dom.window.HTMLDialogElement.prototype,{showModal:{value:function(this:HTMLDialogElement){this.open=true;}},close:{value:function(this:HTMLDialogElement){this.open=false;}}});
 const host=dom.window.document.getElementById("root")!,root=createRoot(host);await act(async()=>root.render(element));
 return {dom,host,root,async click(label:string){const button=[...host.querySelectorAll("button")].find(b=>b.textContent===label);expect(button,host.textContent??"").toBeDefined();await act(async()=>button!.click());},async refresh(visible=true){Object.defineProperty(dom.window.document,"visibilityState",{value:visible?"visible":"hidden",configurable:true});await act(async()=>dom.window.document.dispatchEvent(new dom.window.Event("visibilitychange")));},async close(){await act(async()=>root.unmount());dom.window.close();vi.unstubAllGlobals();}};
}
test("safe booking continuation is exact and survives auth interruption via existing bounded storage",async()=>{
 const path=`/book/mentor?slot=${slot}&duration=25`;expect(parseBookingReturn(path)).toBe(path);expect(parseBookingReturn(path.replace("duration=25","duration=50"))).not.toBeNull();
 for(const value of ["/account","//evil.test",path+"&extra=1",path+"#x",path+"\n",path.replace("slot=","slot=bad"),path.replace("duration=25","duration=30"),"x".repeat(251),"/book/mentor?duration=25"] )expect(parseBookingReturn(value)).toBeNull();
 const view=await mount(<p>Test</p>,`https://local.test/login?returnTo=${encodeURIComponent(path)}`);expect(readInvitationReturn()).toBe(path);view.dom.window.history.replaceState(null,"","/verify-email");expect(readInvitationReturn()).toBe(path);await view.close();
});
test("server pages await params, default ambiguous inputs and mark private robots",async()=>{
 expect(dynamic).toBe("force-dynamic");expect(bookDynamic).toBe(dynamic);expect(metadata.robots.index).toBe(false);expect(bookMeta.robots.follow).toBe(false);
 expect(renderToStaticMarkup(await BookPage({params:Promise.resolve({mentorSlug:"mentor"}),searchParams:Promise.resolve({slot,duration:"50"})}))).toContain("Review your booking");
 expect(renderToStaticMarkup(await BookPage({params:Promise.resolve({mentorSlug:"mentor"}),searchParams:Promise.resolve({slot:[slot],duration:["25"]})}))).toContain("Review your booking");
 expect(renderToStaticMarkup(await BookingPage({params:Promise.resolve({id})}))).toContain("Private booking");expect(renderToStaticMarkup(<BookingTime instant={start}/>)).toContain("UTC");
});
test("duration options paginate, refresh, show no-bookability and select or link actual starts",async()=>{
 let state:BookingOptions={...options,nextCursor:`${start}|${slot}`};const fetcher=vi.fn(async(url:string)=>{expect(url).toContain("booking-options");return ok(state);});vi.stubGlobal("fetch",fetcher);
 const view=await mount(<BookingOptionsPanel slug="mentor"/>);expect(view.host.textContent).toContain("PLN 10.00");expect(view.host.querySelector('a[href^="/book/"]')!.getAttribute("href")).toContain(`slot=${slot}&duration=25`);
 await act(async()=>{const select=view.host.querySelector("select")!;select.value="50";select.dispatchEvent(new view.dom.window.Event("change",{bubbles:true}));});expect(view.host.textContent).toContain("PLN 20.00");await view.click("Next starts");expect(fetcher.mock.calls.at(-1)?.[0]).toContain("after=");await view.click("Refresh starts");expect(fetcher.mock.calls.at(-1)?.[0]).not.toContain("after=");
 state={...options,prices:null,unavailableReason:"Support unavailable",slots:[{id:slot,startsAt:start,bookable:false,reason:"Already reserved"}],nextCursor:null};await view.refresh();expect(view.host.textContent).toContain("Support unavailable");expect(view.host.textContent).toContain("Already reserved");state={...state,slots:[]};await view.refresh();expect(view.host.textContent).toContain("No eligible starts");await view.close();
 const select=vi.fn();vi.stubGlobal("fetch",vi.fn(async()=>ok(options)));const selected=await mount(<BookingOptionsPanel slug="mentor" duration={25} onSelect={select}/>);expect(selected.host.querySelector("select")).toBeNull();await selected.click("Select start");expect(select).toHaveBeenCalledWith(slot,start);await selected.close();
});
test("review truthfully handles loading, errors, stale options, authentication, uncertain retry and success navigation",async()=>{
 let result:Response=fail("UNAUTHORIZED","Sign in"),state=options;const posts:RequestInit[]=[];
 const fetcher=vi.fn(async(path:string,init?:RequestInit)=>{if(init?.method==="POST"){posts.push(init);return result;}return ok(state);});vi.stubGlobal("fetch",fetcher);
 const view=await mount(<BookingReview slug="mentor" slot={slot} duration={25}/>);expect(view.host.textContent).toContain("PLN 10.00");expect(view.host.textContent).toContain("Payment is not verified");await view.click("Book session");expect(view.host.querySelector('a[href^="/login?returnTo="]')).not.toBeNull();
 result=fail();await view.click("Book session");expect(view.host.textContent).toContain("Changed");
 result=fail("NETWORK_ERROR","Offline");await view.click("Book session");expect(view.host.textContent).toContain("Outcome unknown");expect(view.host.textContent).not.toContain("Book a session");result=ok({...detail,replayed:true,appliedVersion:1});await view.click("Reconcile booking attempt");expect(posts.at(-1)?.body).toBe(posts.at(-2)?.body);expect(router.push).toHaveBeenCalledWith(`/account/bookings/${id}`);
 state={...options,bookingAvailable:false,prices:null,handoff:null,slots:[],unavailableReason:"Support unavailable"};await view.refresh();expect(view.host.textContent).toContain("Support unavailable");expect([...view.host.querySelectorAll("button")].find(b=>b.textContent==="Book session")!.disabled).toBe(true);await view.close();
 vi.stubGlobal("fetch",vi.fn(async()=>ok({...options,slots:[],prices:options.prices})));const stale=await mount(<BookingReview slug="mentor" slot={slot} duration={50}/>);expect(stale.host.textContent).toContain("Selected start is no longer available");await stale.close();
});
test("command keeps retry keys, refuses duplicate pending work, survives storage denial and clears definitive failures",async()=>{
 let execute!:ReturnType<typeof useBookingCommand>["execute"],state!:ReturnType<typeof useBookingCommand>;function Consumer(){state=useBookingCommand();execute=state.execute;return <p>{String(state.pending)} {String(state.uncertain)}</p>;}
 const fetcher=vi.fn();vi.stubGlobal("fetch",fetcher);const view=await mount(<Consumer/>);let finish!:(response:Response)=>void;fetcher.mockImplementationOnce(()=>new Promise<Response>(resolve=>{finish=resolve;}));let promise!:ReturnType<typeof execute>;await act(async()=>{promise=execute("/api/bookings",{slotId:slot});});expect(view.host.textContent).toContain("true");expect(await execute("/api/bookings",{})).toMatchObject({ok:false,error:{code:"PENDING"}});await act(async()=>finish(fail("NETWORK_ERROR")));await promise;const first=fetcher.mock.calls[0][1].body;
 fetcher.mockResolvedValueOnce(ok({...detail,appliedVersion:1,replayed:true}));await act(async()=>{await execute("/api/bookings",{slotId:"different"});});expect(fetcher.mock.calls[1][1].body).toBe(first);expect(sessionStorage.getItem("devmentor.booking-attempt")).toBeNull();
 sessionStorage.setItem("devmentor.booking-attempt",JSON.stringify({path:"/api/bookings",intent:JSON.stringify({slotId:slot}),body:first}));await view.close();
 // A reload of the same create intent recovers the stored request key.
 vi.stubGlobal("fetch",fetcher);const second=await mount(<Consumer/>);sessionStorage.setItem("devmentor.booking-attempt",JSON.stringify({path:"/api/bookings",intent:JSON.stringify({slotId:slot}),body:first}));fetcher.mockResolvedValueOnce(ok({...detail,appliedVersion:1,replayed:true}));await act(async()=>{await execute("/api/bookings",{slotId:slot});});expect(fetcher.mock.calls.at(-1)?.[1].body).toBe(first);
 vi.spyOn(second.dom.window.Storage.prototype,"getItem").mockImplementation(()=>{throw new Error("denied");});vi.spyOn(second.dom.window.Storage.prototype,"setItem").mockImplementation(()=>{throw new Error("denied");});vi.spyOn(second.dom.window.Storage.prototype,"removeItem").mockImplementation(()=>{throw new Error("denied");});fetcher.mockResolvedValueOnce(fail());await act(async()=>{await execute("/api/bookings",{slotId:slot});});expect(state.uncertain).toBe(false);await second.close();
});
test("private detail cancellation validates/focuses/escapes reason, retries and refreshes authoritative history",async()=>{
 let state=detail,mutation=fail();const fetcher=vi.fn(async(_url:string,init?:RequestInit)=>init?.method==="POST"?mutation:ok(state));vi.stubGlobal("fetch",fetcher);
 const view=await mount(<BookingDetailPanel id={id}/>);expect(view.host.textContent).toContain("Developer");await view.click("Cancel booking");await view.click("Confirm cancellation");expect(view.host.querySelector('[name="reason"]')!.getAttribute("aria-invalid")).toBe("true");expect(view.dom.window.document.activeElement).toBe(view.host.querySelector('[name="reason"]'));
 view.host.querySelector<HTMLTextAreaElement>('[name="reason"]')!.value="Private <script>reason</script>";await view.click("Confirm cancellation");expect(view.host.textContent).toContain("Changed");
 mutation=fail("NETWORK_ERROR");await view.click("Confirm cancellation");expect(view.host.textContent).toContain("Outcome unknown");await view.click("Cancel");expect(view.host.querySelector("form")).not.toBeNull();
 mutation=ok({...detail,replayed:true,appliedVersion:2});state={...detail,booking:{...detail.booking,status:"cancelled",handoff:null,allowedActions:{cancel:false,complete:false,reschedule:false}},events:[{...detail.events[0],kind:"cancelled",reason:"Private <script>reason</script>",oldStartsAt:start,newStartsAt:end}],nextCursor:"1"};await view.click("Reconcile cancellation");expect(view.host.textContent).toContain("Private <script>reason</script>");expect(view.host.querySelector("script")).toBeNull();expect(view.host.textContent).toContain("Support instructions are temporarily unavailable");await view.click("Next history page");await view.click("First history page");await view.click("Refresh booking");await view.refresh(false);await view.refresh();await view.close();
});
test("private detail reschedules only after explicit review, preserves old price and keeps uncertain intent",async()=>{
 let result=fail("NETWORK_ERROR");const fetcher=vi.fn(async(path:string,init?:RequestInit)=>init?.method==="POST"?result:ok(path.includes("booking-options")?options:detail));vi.stubGlobal("fetch",fetcher);const view=await mount(<BookingDetailPanel id={id}/>);
 await view.click("Reschedule");expect(view.host.textContent).toContain("agreed price remains PLN 10.00");await view.click("Keep original booking");expect(view.host.textContent).not.toContain("Choose a new start");await view.click("Reschedule");await view.click("Select start");expect(view.host.textContent).toContain("Review new start");await view.click("Confirm new start");expect(view.host.textContent).toContain("Outcome unknown");await view.click("Select start");result=ok({...detail,replayed:true,appliedVersion:2});await view.click("Reconcile move");expect(view.host.textContent).not.toContain("Choose a new start");await view.click("Cancel booking");await view.click("Cancel");expect(view.host.querySelector("form")).toBeNull();await view.close();
});
test("completion requires explicit checkbox/dialog, dismiss leaves state unchanged; mentor/terminal states stay truthful",async()=>{
 let state={...detail,booking:{...detail.booking,serverNow:end,allowedActions:{cancel:true,reschedule:false,complete:true}}},result=fail("NETWORK_ERROR");vi.stubGlobal("fetch",vi.fn(async(_path:string,init?:RequestInit)=>init?.method==="POST"?result:ok(state)));
 const view=await mount(<BookingDetailPanel id={id}/>);expect(view.host.textContent).toContain("Awaiting your confirmation");await view.click("Confirm service received");expect(view.host.querySelector("dialog")!.open).toBe(true);await view.click("Cancel");expect(view.host.querySelector("dialog")).toBeNull();await view.click("Confirm service received");await act(async()=>view.host.querySelector("dialog")!.dispatchEvent(new view.dom.window.Event("cancel",{bubbles:true})));await view.click("Confirm service received");
 const checkbox=view.host.querySelector<HTMLInputElement>('[name="confirmation"]')!;await act(async()=>checkbox.click());const submit=[...view.host.querySelectorAll("button")].find(b=>b.type==="submit")!;await act(async()=>submit.click());expect(view.host.textContent).toContain("Outcome unknown");await view.click("Cancel");await act(async()=>view.host.querySelector("dialog")!.dispatchEvent(new view.dom.window.Event("cancel",{bubbles:true})));
 result=ok({...detail,replayed:true,appliedVersion:2});state={...state,booking:{...state.booking,status:"completed",allowedActions:{cancel:false,reschedule:false,complete:false}}};await view.click("Reconcile confirmation");expect(view.host.textContent).toContain("Developer-confirmed service received");await view.close();
 vi.stubGlobal("fetch",vi.fn(async()=>ok({...detail,booking:{...detail.booking,viewerRole:"mentor",serverNow:end,allowedActions:{cancel:true,reschedule:false,complete:false}}})));const mentor=await mount(<BookingDetailPanel id={id}/>);expect(mentor.host.textContent).toContain("Awaiting developer confirmation");expect(mentor.host.textContent).not.toContain("Confirm service received");await mentor.close();
});
test("reloaded unknown booking reconciles even when capacity is now occupied and price changed; auth denial retains that key",async()=>{
 const body=JSON.stringify({mentorSlug:"mentor",slotId:slot,durationMinutes:25,expectedPriceCents:1000,currency:"PLN",requestId:randomUUID()});
 const stored=JSON.stringify({path:"/api/bookings",intent:"prior",body});
 const fetcher=vi.fn(async(_path:string,init?:RequestInit)=>init?.method==="POST"?fail("UNAUTHORIZED","Sign in"):ok({...options,prices:{price25Cents:2000,price50Cents:4000},slots:[{...options.slots[0],bookable:false,reason:"Already reserved"}]}));vi.stubGlobal("fetch",fetcher);
 // Exercise recovery with a preloaded real store, including malformed and mismatched records.
 for(const data of [stored,"broken",JSON.stringify({path:"bad",body}),JSON.stringify({path:"/api/bookings",body:"x".repeat(8193)}),JSON.stringify({path:"/api/bookings",body:"{}"}),JSON.stringify({path:"/api/bookings",body:body.replace("mentor","another")}),JSON.stringify({path:"/api/bookings",body:body.replace(slot,randomUUID())}),JSON.stringify({path:"/api/bookings",body:body.replace('"durationMinutes":25','"durationMinutes":50')}),"null"]) {
  vi.stubGlobal("fetch",fetcher);let state!:ReturnType<typeof useBookingCommand>;function Consumer(){state=useBookingCommand({mentorSlug:"mentor",slotId:slot,durationMinutes:25});return <p>{String(state.uncertain)}</p>;}
  const v=await mount(<p/>);v.dom.window.sessionStorage.setItem("devmentor.booking-attempt",data);await act(async()=>v.root.render(<Consumer/>));
  expect(state.uncertain).toBe(data===stored);
  if(data===stored){await act(async()=>{await state.execute("/api/bookings",{});});expect(JSON.parse(v.dom.window.sessionStorage.getItem("devmentor.booking-attempt")!).body).toBe(body);expect(state.uncertain).toBe(true);expect(fetcher.mock.calls.at(-1)?.[1]?.body).toBe(body);}
  if(data===stored){await act(async()=>v.root.render(<BookingReview slug="mentor" slot={slot} duration={25}/>));expect([...v.host.querySelectorAll("button")].find(b=>b.textContent==="Reconcile booking attempt")!.disabled).toBe(false);}
  await v.close();
 }
});
