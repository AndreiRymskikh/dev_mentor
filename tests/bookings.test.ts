import {test,expect,vi} from "vitest";
import {randomUUID} from "node:crypto";
import {BookingService,bookingRetention} from "../packages/core/src/services/bookings/booking.service";
import {readBookingHandoff} from "../packages/core/src/services/bookings/config";
import * as schemas from "@devmentor/core/validators/bookings";
import {BookingMissingError,BookingKeyConflictError,type BookingDecisionContext,type BookingRecord,type BookingSnapshot,type BookingRepository} from "@devmentor/db";
import {AppError} from "@devmentor/core/http";
const actor=randomUUID(),mentor=randomUUID(),slotId=randomUUID(),id=randomUUID(),requestId=randomUUID();
const now=new Date("2026-08-31T12:00:00Z"),start=new Date("2026-08-31T14:00:00Z"),end=new Date("2026-08-31T14:25:00Z");
const handoff=()=>({guidance:"Arrange text mentoring directly. Pay mentor externally.",supportUrl:"https://example.test/support"});
const policy=()=>({currency:"PLN" as const,priceBounds:{p25:{minCents:100,maxCents:10000},p50:{minCents:200,maxCents:20000}}});
const create={mentorSlug:"mentor",slotId,durationMinutes:25,expectedPriceCents:1000,currency:"PLN",requestId};
function fixture() {
 const booking:BookingRecord={id,developerUserId:actor,mentorUserId:mentor,slotId,startsAt:start,endsAt:end,durationMinutes:25,priceCents:1000,currency:"PLN",status:"booked",version:1,createdAt:now,updatedAt:now,retentionExpiresAt:bookingRetention(end),cancelledAt:null,completedAt:null};
 const context={booking:null,profile:{userId:mentor,publishedAt:now,price25Cents:1000,price50Cents:2000},slot:{id:slotId,mentorProfileId:mentor,startsAt:start,removedAt:null},actor:{id:actor,emailVerifiedAt:now},developer:true,mentor:true,now,conflicts:vi.fn(async()=>false)} as unknown as BookingDecisionContext;
 const snapshot:BookingSnapshot={booking,mentorName:"Mentor",developerName:"Developer",mentorSlug:"mentor",events:[],nextEvent:null,now};
 const options={profile:context.profile!,mentorName:"Mentor",slots:[{id:slotId,startsAt:start,occupied:false}],more:false,now};
 const repo={mutate:vi.fn(async(_input,clock,decide)=>{clock();const change=await decide({...context,booking:context.booking?{...context.booking}:null});snapshot.booking=change.booking;return {snapshot,appliedVersion:change.booking.version,replayed:false};}),read:vi.fn(async()=>snapshot as BookingSnapshot|null),list:vi.fn(async()=>({items:[snapshot],more:false,now})),options:vi.fn(async()=>options as typeof options|null),maintain:vi.fn(async()=>2)} satisfies Pick<BookingRepository,"mutate"|"read"|"list"|"options"|"maintain">;
 const service=new BookingService(repo,()=>now,policy,handoff);return {booking,context,snapshot,options,repo,service};
}
test("strict schemas reject forged authority, invalid pagination and malformed UUIDs; UTC retention clamps month end",()=>{
 expect(bookingRetention(new Date("2026-08-31T10:12:01.123Z")).toISOString()).toBe("2027-02-28T10:12:01.123Z");
 expect(bookingRetention(now,new Date("2026-09-01T12:00:00Z")).toISOString()).toBe("2027-03-01T12:00:00.000Z");
 expect(schemas.bookingCreateSchema.parse({...create,requestId:requestId.toUpperCase()}).requestId).toBe(requestId);
 for(const input of [{...create,state:"completed"},{...create,currency:"EUR"},{...create,requestId:"bad"},{...create,durationMinutes:30}])expect(schemas.bookingCreateSchema.safeParse(input).success).toBe(false);
 expect(schemas.bookingCancelSchema.parse({requestId,expectedVersion:1,reason:" reason "}).reason).toBe("reason");
 for(const reason of [" ","x".repeat(1001)])expect(schemas.bookingCancelSchema.safeParse({requestId,expectedVersion:1,reason}).success).toBe(false);
 expect(schemas.bookingCompleteSchema.safeParse({requestId,expectedVersion:1,confirmation:false}).success).toBe(false);
 expect(schemas.bookingListSchema.parse({})).toEqual({view:"upcoming",limit:25,after:undefined});
 expect(schemas.bookingListSchema.parse({view:"history",limit:"1",after:`history|${start.toISOString()}|${id}`})).toMatchObject({after:{startsAt:start,id}});
 for(const input of [{after:"bad"},{after:`history|${start.toISOString()}|${id}`},{after:`upcoming|bad|${id}`},{after:`upcoming|${start.toISOString()}|${id}|extra`},{limit:101},{actor}])expect(schemas.bookingListSchema.safeParse(input).success).toBe(false);
 expect(schemas.bookingOptionsSchema.parse({duration:"50",slot:slotId})).toMatchObject({duration:50,limit:50,slot:slotId});
 expect(schemas.bookingEventsSchema.parse({})).toEqual({after:0,limit:25});
});
test("lazy handoff permits accountable HTTPS/mailto only and does not leak configuration",()=>{
 expect(()=>readBookingHandoff({})).toThrow();
 for(const url of ["https://example.test/support","mailto:support@example.test"])expect(readBookingHandoff({BOOKING_SESSION_GUIDANCE:" Direct contact ",BOOKING_SUPPORT_URL:url})).toEqual({guidance:"Direct contact",supportUrl:url});
 for(const url of ["javascript:alert(1)","https://u:p@example.test","mailto:x@example.test?bcc=secret@example.test","https://example.test/%0a","https://example.test\nsecret","bad","mailto:bad","http://example.test"])expect(()=>readBookingHandoff({BOOKING_SESSION_GUIDANCE:"Contact",BOOKING_SUPPORT_URL:url})).toThrow();
 for(const guidance of ["", " ","x".repeat(2001)])expect(()=>readBookingHandoff({BOOKING_SESSION_GUIDANCE:guidance,BOOKING_SUPPORT_URL:"https://example.test"})).toThrow();
 expect(()=>readBookingHandoff({BOOKING_SESSION_GUIDANCE:"Contact",BOOKING_SUPPORT_URL:"x".repeat(2049)})).toThrow();
 vi.stubEnv("BOOKING_SESSION_GUIDANCE","Contact");vi.stubEnv("BOOKING_SUPPORT_URL","https://example.test");expect(readBookingHandoff().guidance).toBe("Contact");vi.unstubAllEnvs();
});
test("creation snapshots current terms, exact lead boundary and keeps private IDs off DTO",async()=>{
 const f=fixture(),result=await f.service.create(actor,create);
 expect(result.booking).toMatchObject({status:"booked",version:1,priceCents:1000,counterpart:{displayName:"Mentor",mentorSlug:"mentor"},viewerRole:"developer",allowedActions:{cancel:true,reschedule:true,complete:false},handoff:handoff()});
 expect(JSON.stringify(result)).not.toContain(actor);expect(JSON.stringify(result)).not.toContain(mentor);
 expect(f.context.conflicts).toHaveBeenCalledWith(start,end);expect(f.repo.mutate).toHaveBeenCalledWith(expect.objectContaining({operation:"create",digest:expect.stringMatching(/^[a-f0-9]{64}$/)}),expect.any(Function),expect.any(Function));
 expect((await f.service.create(actor,{...create,durationMinutes:50,expectedPriceCents:2000})).booking.endsAt).toBe("2026-08-31T14:50:00.000Z");
 for(const price of [999,1001])await expect(f.service.create(actor,{...create,expectedPriceCents:price})).rejects.toMatchObject({status:409});
 await expect(f.service.create(null,create)).rejects.toMatchObject({status:401});await expect(f.service.create(actor,{})).rejects.toMatchObject({status:422});await expect(f.service.create(actor,null)).rejects.toMatchObject({status:422});
});
test("fresh transitions fail closed for current identity, roles, offers, policy, capacity and removed/past/horizon slots",async()=>{
 const f=fixture();
 const mutations=[(c:BookingDecisionContext)=>{c.actor=null;},(c:BookingDecisionContext)=>{c.actor!.emailVerifiedAt=null;},(c:BookingDecisionContext)=>{c.developer=false;},(c:BookingDecisionContext)=>{c.mentor=false;},(c:BookingDecisionContext)=>{c.profile=null;},(c:BookingDecisionContext)=>{c.profile!.publishedAt=null;},(c:BookingDecisionContext)=>{c.profile!.userId=actor;},(c:BookingDecisionContext)=>{c.profile!.price25Cents=null;},(c:BookingDecisionContext)=>{c.profile!.price50Cents=1;},(c:BookingDecisionContext)=>{c.profile!.price25Cents=10001;},(c:BookingDecisionContext)=>{c.profile!.price25Cents=1.5;},(c:BookingDecisionContext)=>{c.slot=null;},(c:BookingDecisionContext)=>{c.slot!.removedAt=now;},(c:BookingDecisionContext)=>{c.slot!.startsAt=new Date(start.getTime()-1);},(c:BookingDecisionContext)=>{c.slot!.startsAt=new Date("2027-03-01");},(c:BookingDecisionContext)=>{c.conflicts=async()=>true;}];
 for(const mutate of mutations){const g=fixture();mutate(g.context);await expect(g.service.create(actor,create)).rejects.toBeInstanceOf(AppError);}
 for(const source of [()=>{throw new Error("policy");}])await expect(new BookingService(f.repo,()=>now,source,handoff).create(actor,create)).rejects.toMatchObject({status:503});
 await expect(new BookingService(f.repo,()=>now,policy,()=>{throw new Error("config");}).create(actor,create)).rejects.toMatchObject({status:503});
});
test("reschedule is developer-only before start, preserves terms and validates new capacity",async()=>{
 const f=fixture();f.context.booking={...f.booking};f.context.slot!.startsAt=new Date(start.getTime()+86400000);f.context.profile!.price25Cents=5000;
 const result=await f.service.change(actor,id,"reschedule",{requestId,slotId,expectedVersion:1});expect(result.booking).toMatchObject({version:2,priceCents:1000,startsAt:"2026-09-01T14:00:00.000Z"});
 const g=fixture();g.context.booking={...g.booking};g.context.now=start;await expect(g.service.change(actor,id,"reschedule",{requestId,slotId,expectedVersion:1})).rejects.toMatchObject({status:409});
 g.context.now=now;await expect(g.service.change(mentor,id,"reschedule",{requestId,slotId,expectedVersion:1})).rejects.toMatchObject({status:403});
});
test("private cancellation stays available during/after end and role loss; only developer completes after end",async()=>{
 for(const time of [now,start,end,new Date(end.getTime()+86400000)]) {
  const f=fixture();f.context.booking={...f.booking};f.context.now=time;f.snapshot.now=time;f.context.mentor=false;f.context.developer=false;
  expect((await f.service.change(actor,id,"cancel",{requestId,reason:" <script>private</script> ",expectedVersion:1})).booking).toMatchObject({status:"cancelled",version:2,cancelledAt:time.toISOString(),allowedActions:{cancel:false,reschedule:false,complete:false}});
 }
 const f=fixture();f.context.booking={...f.booking};await expect(f.service.change(actor,id,"complete",{requestId,confirmation:true,expectedVersion:1})).rejects.toMatchObject({status:409});
 f.context.now=end;f.snapshot.now=end;expect((await f.service.change(actor,id,"complete",{requestId,confirmation:true,expectedVersion:1})).booking).toMatchObject({status:"completed",completedAt:end.toISOString()});
 for(const operation of ["cancel","reschedule","complete"] as const) {const g=fixture();g.context.booking={...g.booking,status:"cancelled"};await expect(g.service.change(actor,id,operation,operation==="cancel"?{requestId,reason:"x",expectedVersion:1}:operation==="reschedule"?{requestId,slotId,expectedVersion:1}:{requestId,confirmation:true,expectedVersion:1})).rejects.toMatchObject({status:409});}
 const g=fixture();g.context.booking={...g.booking};await expect(g.service.change(actor,id,"cancel",{requestId,reason:"x",expectedVersion:2})).rejects.toMatchObject({status:409});g.context.actor=null;await expect(g.service.change(actor,id,"cancel",{requestId,reason:"x",expectedVersion:1})).rejects.toMatchObject({status:401});
 await expect(f.service.change(actor,"bad","cancel",{})).rejects.toMatchObject({status:404});
});
test("detail and list allowlist private history, paginate consistently and survive missing handoff",async()=>{
 const f=fixture();f.snapshot.events=[{id:randomUUID(),bookingId:id,actorUserId:mentor,kind:"cancelled",version:2,occurredAt:now,reason:"private",oldSlotId:null,newSlotId:null,oldStartsAt:null,newStartsAt:null},{id:randomUUID(),bookingId:id,actorUserId:actor,kind:"rescheduled",version:1,occurredAt:now,reason:null,oldSlotId:slotId,newSlotId:slotId,oldStartsAt:now,newStartsAt:start}];f.snapshot.nextEvent=2;
 expect(await f.service.read(mentor,id,{},true)).toMatchObject({booking:{viewerRole:"mentor",counterpart:{displayName:"Developer"}},nextCursor:"2",events:[{actorRole:"mentor",actorName:"Mentor",reason:"private"},{actorRole:"developer",oldStartsAt:now.toISOString()}]});
 expect((await f.service.read(randomUUID(),id)).booking.viewerRole).toBe("administrator");
 f.snapshot.mentorSlug=null;f.snapshot.booking.cancelledAt=now;f.snapshot.booking.completedAt=now;expect((await f.service.read(actor,id)).booking).toMatchObject({counterpart:{displayName:"Mentor"},cancelledAt:now.toISOString(),completedAt:now.toISOString()});
 f.repo.read.mockResolvedValueOnce(null);await expect(f.service.read(actor,id)).rejects.toMatchObject({status:404});
 const noHandoff=new BookingService(f.repo,()=>now,policy,()=>{throw new Error("config");});expect((await noHandoff.read(actor,id)).booking.handoff).toBeNull();
 f.repo.list.mockResolvedValueOnce({items:[f.snapshot],more:true,now});expect((await f.service.list(actor,{view:"history"})).nextCursor).toBe(`history|${start.toISOString()}|${id}`);
 expect((await f.service.list(actor)).nextCursor).toBeNull();f.repo.list.mockResolvedValueOnce({items:[],more:true,now});expect((await f.service.list(actor)).items).toEqual([]);
});
test("public options expose no private reservation data and distinguish policy, pricing, capacity and handoff",async()=>{
 const f=fixture();expect(await f.service.options("mentor")).toMatchObject({bookingAvailable:true,unavailableReason:null,prices:{price25Cents:1000},slots:[{bookable:true,reason:null}],refreshAt:"2026-08-31T12:00:00.001Z"});
 f.options.slots[0].occupied=true;f.options.more=true;expect(await f.service.options("mentor",{duration:50,slot:slotId})).toMatchObject({slots:[{bookable:false,reason:"Already reserved."}],nextCursor:`${start.toISOString()}|${slotId}`});
 f.options.profile.price25Cents=null;expect(await f.service.options("mentor")).toMatchObject({bookingAvailable:false,unavailableReason:"Mentor prices are unavailable."});
 expect(await new BookingService(f.repo,()=>now,()=>{throw new Error();},handoff).options("mentor")).toMatchObject({unavailableReason:"Price policy is unavailable."});
 f.options.slots=[];expect(await new BookingService(f.repo,()=>now,policy,()=>{throw new Error();}).options("mentor")).toMatchObject({unavailableReason:"Booking service and support instructions are unavailable.",refreshAt:null,nextCursor:null});
 f.repo.options.mockResolvedValueOnce(null);await expect(f.service.options("mentor")).rejects.toMatchObject({status:404});await expect(f.service.options("../bad")).rejects.toMatchObject({status:404});
 expect(await f.service.maintain()).toBe(2);
});
test("repository failures map safely, retained replay preserves original applied version, defaults resolve lazily",async()=>{
 const f=fixture();
 for(const [error,status] of [[new BookingMissingError(),404],[new BookingKeyConflictError(),409],[new AppError("DENIED","Denied",403),403],[new Error("secret"),503]] as const){f.repo.read.mockRejectedValueOnce(error);await expect(f.service.read(actor,id)).rejects.toMatchObject({status});}
 f.repo.mutate.mockImplementationOnce(async()=>({snapshot:f.snapshot,appliedVersion:1,replayed:true}));expect(await f.service.create(actor,create)).toMatchObject({appliedVersion:1,replayed:true});
 vi.stubEnv("BOOKING_SESSION_GUIDANCE","Contact");vi.stubEnv("BOOKING_SUPPORT_URL","https://example.test");expect((await new BookingService(f.repo).read(actor,id)).booking.handoff).not.toBeNull();vi.unstubAllEnvs();
 const real={...f.repo,maintain:vi.fn(async()=>0)};await new BookingService(real).maintain();expect(real.maintain).toHaveBeenCalledWith(expect.any(Date));
});
