import {test,expect,vi} from "vitest";
import {randomUUID} from "node:crypto";
import {LockMode,UniqueConstraintViolationException} from "@mikro-orm/postgresql";
import {BookingRepository,BookingMissingError,BookingKeyConflictError,Booking,BookingEvent,BookingCommand,User,UserRole,MentorProfile,Slot,createDatabaseRuntime,type BookingRecord,type BookingChange,type BookingDecisionContext} from "@devmentor/db";
import {Migration202611090001} from "../packages/db/src/migrations/Migration202611090001";
const actor=randomUUID(),mentor=randomUUID(),id=randomUUID(),slotId=randomUUID(),now=new Date("2026-08-31T12:00:00Z"),start=new Date(now.getTime()+7200000),end=new Date(start.getTime()+1500000);
function fixture(){
 const booking:BookingRecord={id,developerUserId:actor,mentorUserId:mentor,slotId,startsAt:start,endsAt:end,durationMinutes:25,priceCents:1000,currency:"PLN",status:"booked",version:1,createdAt:now,updatedAt:now,cancelledAt:null,completedAt:null,retentionExpiresAt:new Date("2027-03-01")};
 const profile={userId:mentor,slug:"mentor",publishedAt:now},slot={id:slotId,mentorProfileId:mentor,startsAt:start,removedAt:null},user={id:actor,displayName:"Name",emailVerifiedAt:now};
 const findOne=vi.fn(async(entity:unknown,query:Record<string,unknown>,_options?:{lockMode?:LockMode;refresh?:boolean})=>{void _options;return entity===BookingCommand?null:entity===Booking?typeof query.id==="string"?booking:null:entity===MentorProfile?profile:entity===User?user:entity===UserRole?{}:slot;});
 const events=[{id:randomUUID(),bookingId:id,actorUserId:actor,version:1,kind:"created",occurredAt:now,reason:null,oldStartsAt:null,newStartsAt:null}];
 const find=vi.fn(async(entity:unknown)=>entity===BookingEvent?events:entity===Slot?[slot]:[booking]);
 const create=vi.fn((_entity:unknown,data:unknown)=>data),flush=vi.fn(),assign=vi.fn((target,data)=>Object.assign(target,data)),nativeDelete=vi.fn(),execute=vi.fn();
 const em={findOne,findOneOrFail:vi.fn(async()=>user),find,create,assign,flush,nativeDelete,execute};
 const runtime=createDatabaseRuntime();vi.spyOn(runtime,"transaction").mockImplementation(async work=>work(em as never));
 const repo=new BookingRepository(runtime),input={actor,requestId:randomUUID(),digest:"a".repeat(64),operation:"create" as const,mentorSlug:"mentor",slotId};
 const decide=vi.fn(async(c:BookingDecisionContext):Promise<BookingChange>=>{expect(c.now).toEqual(now);return {booking:{...booking}};});return {booking,profile,slot,user,events,em,runtime,repo,input,decide};
}
test("new command locks participants in UUID order, checks capacity inside locks and commits event/command atomically",async()=>{
 const f=fixture();const result=await f.repo.mutate(f.input,()=>now,async c=>{expect(c).toMatchObject({actor:f.user,developer:true,mentor:true,booking:null,profile:f.profile,slot:f.slot});expect(await c.conflicts(start,end)).toBe(false);return {booking:f.booking};});
 expect(result).toMatchObject({appliedVersion:1,replayed:false,snapshot:{booking:{id},mentorName:"Name",developerName:"Name"}});
 expect(f.em.findOne.mock.calls.filter(([entity,,options])=>entity===User&&options?.lockMode===LockMode.PESSIMISTIC_WRITE).map(([,query])=>query.id)).toEqual([actor,mentor].sort());
 expect(f.em.create).toHaveBeenCalledWith(BookingEvent,expect.objectContaining({kind:"created",reason:null,version:1,oldSlotId:null}));expect(f.em.create).toHaveBeenCalledWith(BookingCommand,expect.objectContaining({actorUserId:actor,requestId:f.input.requestId}));expect(f.em.flush).toHaveBeenCalledOnce();
 expect(f.em.findOne).toHaveBeenCalledWith(Booking,expect.objectContaining({$or:[{mentorUserId:{$in:[actor,mentor].sort()}},{developerUserId:{$in:[actor,mentor].sort()}}],startsAt:{$lt:end},endsAt:{$gt:start}}));
});
test("retained authorized replay precedes new eligibility; mismatched keys and expired/unowned commands fail",async()=>{
 const f=fixture();const real=f.em.findOne.getMockImplementation()!;let digest=f.input.digest,missing=false;
 f.em.findOne.mockImplementation(async(entity,query)=>entity===BookingCommand?{bookingId:id,digest,operation:"create",appliedVersion:1}:entity===Booking&&missing?null:real(entity,query));
 expect(await f.repo.mutate(f.input,()=>now,f.decide)).toMatchObject({replayed:true,appliedVersion:1});expect(f.decide).not.toHaveBeenCalled();expect(f.em.create).not.toHaveBeenCalled();
 digest="b".repeat(64);await expect(f.repo.mutate(f.input,()=>now,f.decide)).rejects.toBeInstanceOf(BookingKeyConflictError);missing=true;await expect(f.repo.mutate(f.input,()=>now,f.decide)).rejects.toBeInstanceOf(BookingMissingError);
});
test("waiter repeats command lookup after user locks; command uniqueness rollback reconciles winner",async()=>{
 const f=fixture(),real=f.em.findOne.getMockImplementation()!;let commands=0;
 f.em.findOne.mockImplementation(async(entity,query)=>entity===BookingCommand?(++commands===1?null:{bookingId:id,digest:f.input.digest,operation:"create",appliedVersion:1}):real(entity,query));
 expect((await f.repo.mutate(f.input,()=>now,f.decide)).replayed).toBe(true);expect(f.decide).not.toHaveBeenCalled();
 commands=0;f.em.findOne.mockImplementation(async(entity,query)=>entity===BookingCommand?(++commands<=2?null:{bookingId:id,digest:f.input.digest,operation:"create",appliedVersion:1}):real(entity,query));f.em.flush.mockRejectedValueOnce(new UniqueConstraintViolationException(new Error("duplicate")));
 expect((await f.repo.mutate(f.input,()=>now,f.decide)).replayed).toBe(true);
 f.em.findOne.mockImplementation(real);f.em.flush.mockRejectedValueOnce(new UniqueConstraintViolationException(new Error("unrelated")));await expect(f.repo.mutate(f.input,()=>now,f.decide)).rejects.toBeInstanceOf(UniqueConstraintViolationException);
 f.em.flush.mockRejectedValueOnce(new Error("outage"));await expect(f.repo.mutate(f.input,()=>now,f.decide)).rejects.toThrow("outage");
});
test("existing transitions lock/re-read booking, preserve move audit and exclude self from capacity",async()=>{
 for(const [operation,kind] of [["reschedule","rescheduled"],["cancel","cancelled"],["complete","completed"]] as const){const f=fixture();
  const result=await f.repo.mutate({...f.input,operation,bookingId:id,mentorSlug:undefined,slotId:operation==="reschedule"?slotId:undefined},()=>now,async c=>{expect(c.booking?.id).toBe(id);expect(await c.conflicts(start,end)).toBe(false);return {booking:{...c.booking!,version:2},...(operation==="cancel"?{reason:"Reason"}:{})};});
  expect(result.appliedVersion).toBe(2);expect(f.em.assign).toHaveBeenCalled();expect(f.em.create).toHaveBeenCalledWith(BookingEvent,expect.objectContaining({kind,reason:operation==="cancel"?"Reason":null,oldStartsAt:operation==="reschedule"?start:null,newSlotId:operation==="reschedule"?slotId:null}));
  expect(f.em.findOne).toHaveBeenCalledWith(Booking,expect.objectContaining({id:{$ne:id}}));
 }
 const f=fixture(),real=f.em.findOne.getMockImplementation()!;f.em.findOne.mockImplementation(async(entity,query)=>entity===Booking&&query.id?null:real(entity,query));await expect(f.repo.mutate({...f.input,bookingId:id},()=>now,f.decide)).rejects.toBeInstanceOf(BookingMissingError);
 f.em.findOne.mockImplementation(async(entity,query,options)=>entity===Booking&&options?.refresh?null:real(entity,query));await expect(f.repo.mutate({...f.input,bookingId:id},()=>now,f.decide)).rejects.toBeInstanceOf(BookingMissingError);
 f.em.findOne.mockResolvedValue(null);await expect(f.repo.mutate(f.input,()=>now,f.decide)).rejects.toBeInstanceOf(BookingMissingError);
});
test("read authorization and bounded private history enforce current admin membership and retention",async()=>{
 const f=fixture();expect(await f.repo.read(actor,id,()=>now)).toMatchObject({nextEvent:null,events:[{kind:"created"}]});
 f.em.find.mockResolvedValueOnce([...f.events,{...f.events[0],version:2}] as never);expect(await f.repo.read(actor,id,()=>now,true,0,1)).toMatchObject({nextEvent:1});
 const real=f.em.findOne.getMockImplementation()!;
 f.em.findOne.mockImplementation(async(entity,query)=>entity===UserRole?null:real(entity,query));expect(await f.repo.read(actor,id,()=>now,true)).toBeNull();
 f.em.findOne.mockImplementation(async(entity,query)=>entity===User?{...f.user,emailVerifiedAt:null}:real(entity,query));expect(await f.repo.read(actor,id,()=>now)).toBeNull();
 f.em.findOne.mockImplementation(async(entity,query)=>entity===User?null:real(entity,query));expect(await f.repo.read(actor,id,()=>now)).toBeNull();
 f.em.findOne.mockImplementation(async(entity,query)=>entity===Booking?null:entity===MentorProfile?null:real(entity,query));expect(await f.repo.read(actor,id,()=>now)).toBeNull();
 f.em.findOne.mockImplementation(async(entity,query)=>entity===MentorProfile?null:real(entity,query));expect(await f.repo.read(actor,id,()=>now)).toMatchObject({mentorSlug:null});
});
test("lists use SQL view/order/tuple bounds and limit projections",async()=>{
 const f=fixture();for(const view of ["upcoming","history"] as const){expect((await f.repo.list(actor,{view,limit:1,after:{startsAt:start,id}},()=>now)).items).toHaveLength(1);expect(f.em.find).toHaveBeenCalledWith(Booking,expect.objectContaining({retentionExpiresAt:{$gt:now}}),expect.objectContaining({limit:2,orderBy:{startsAt:view==="history"?"desc":"asc",id:view==="history"?"desc":"asc"}}));}
 f.em.find.mockResolvedValueOnce([f.booking,f.booking] as never);expect((await f.repo.list(actor,{view:"upcoming",limit:1},()=>now)).more).toBe(true);
});
test("public options hide participants, bound slot queries and check occupied intervals without loading histories",async()=>{
 const f=fixture();const options=await f.repo.options("mentor",1,{startsAt:start,id:slotId},()=>now,50,7200000,slotId);expect(options).toMatchObject({slots:[{id:slotId,occupied:false}],more:false});
 expect(f.em.findOne).toHaveBeenCalledWith(Booking,expect.objectContaining({endsAt:{$gt:start},startsAt:{$lt:new Date(start.getTime()+3000000)}}));
 f.em.find.mockResolvedValueOnce([f.slot,f.slot] as never);expect(await f.repo.options("mentor",1,undefined,()=>now,25,7200000)).toMatchObject({more:true});
 const real=f.em.findOne.getMockImplementation()!;
 for(const missing of [MentorProfile,User,UserRole]){f.em.findOne.mockImplementation(async(entity,query)=>entity===missing?null:real(entity,query));expect(await f.repo.options("mentor",1,undefined,()=>now,25,7200000)).toBeNull();}
 let reads=0;f.em.findOne.mockImplementation(async(entity,query)=>entity===MentorProfile&&++reads===2?null:real(entity,query));expect(await f.repo.options("mentor",1,undefined,()=>now,25,7200000)).toBeNull();
});
test("maintenance uses skip-locked bounded deletion; migration down refuses history",async()=>{
 const f=fixture();expect(await f.repo.maintain(now)).toBe(1);expect(f.em.find).toHaveBeenCalledWith(Booking,{retentionExpiresAt:{$lte:now}},expect.objectContaining({limit:500,lockMode:LockMode.PESSIMISTIC_PARTIAL_WRITE}));expect(f.em.nativeDelete).toHaveBeenCalledWith(Booking,{id:{$in:[id]}});f.em.find.mockResolvedValueOnce([]);expect(await f.repo.maintain(now)).toBe(0);
 const m=Object.create(Migration202611090001.prototype) as Migration202611090001;const sql=vi.fn();m.addSql=sql;m.up();m.down();expect(sql.mock.calls.some(([s])=>s.includes("bookings_time_check"))).toBe(true);expect(sql.mock.calls.at(-2)?.[0]).toContain("Refusing destructive booking rollback");expect(sql.mock.calls.at(-3)?.[0]).toContain("lock table");
 expect(new BookingRepository()).toBeDefined();
});
