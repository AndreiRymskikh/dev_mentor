import {LockMode} from "@mikro-orm/postgresql";
import {execFile} from "node:child_process";
import {promisify} from "node:util";
import {integrationConfig} from "./config";
import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import {createDatabaseRuntime,BookingRepository,Booking,BookingEvent,BookingCommand,User,UserRole,MentorProfile,Slot,SlotRepository} from "../../packages/db/src";
import {BookingService,bookingRetention} from "../../packages/core/src/services/bookings/booking.service";
export async function testBookings(runtime:ReturnType<typeof createDatabaseRuntime>) {
 const ids=Array.from({length:5},()=>randomUUID()),slots=Array.from({length:5},()=>randomUUID()),now=new Date("2026-08-31T12:00:00Z"),starts=["2026-09-01T12:00:00Z","2026-09-01T12:25:00Z","2026-09-01T13:00:00Z","2026-09-02T12:00:00Z","2026-09-03T12:00:00Z"].map(s=>new Date(s));let clock=now;
 const policy=()=>({currency:"PLN" as const,priceBounds:{p25:{minCents:100,maxCents:10000},p50:{minCents:200,maxCents:20000}}}),handoff=()=>({guidance:"External text session; arrange direct payment.",supportUrl:"https://example.test/support"});
 const repository=new BookingRepository(runtime),service=new BookingService(repository,()=>clock,policy,handoff);
 await runtime.transaction(async em=>{
  for(const [i,id]of ids.entries()){em.create(User,{id,normalizedEmail:`book-${id}@example.test`,displayName:`Booking user ${i}`,emailVerifiedAt:now,createdAt:now,updatedAt:now});em.create(UserRole,{userId:id,role:"developer"});if(i<2)em.create(UserRole,{userId:id,role:"mentor"});if(i===4)em.create(UserRole,{userId:id,role:"administrator"});}
  for(const [i,id]of ids.slice(0,2).entries())em.create(MentorProfile,{userId:id,slug:`booking-${i}`,publishedAt:now,price25Cents:1000,price50Cents:2000,stackTags:[]});
  for(const [i,id]of slots.entries())em.create(Slot,{id,mentorProfileId:ids[0],startsAt:starts[i]});
 });
 const input=(slotId=slots[0],durationMinutes=25,requestId=randomUUID())=>({mentorSlug:"booking-0",slotId,durationMinutes,expectedPriceCents:durationMinutes===25?1000:2000,currency:"PLN",requestId});
 try {
  const orm=await runtime.getOrm();assert.equal(await orm.schema.getUpdateSchemaSQL({wrap:false}),"");
  await assert.rejects(service.create(ids[0],input()),{status:403});await assert.rejects(service.create(ids[2],{...input(),expectedPriceCents:999}),{status:409});
  clock=new Date(starts[0].getTime()-7200000);
  const retry=input(slots[0],50);const same=await Promise.all(Array.from({length:8},()=>service.create(ids[2],retry)));
  assert.equal(new Set(same.map(r=>r.booking.id)).size,1);assert.equal(same.filter(r=>!r.replayed).length,1);const id=same[0].booking.id;
  await runtime.withEntityManager(async em=>{assert.equal(await em.count(Booking,{id}),1);assert.equal(await em.count(BookingEvent,{bookingId:id}),1);assert.equal(await em.count(BookingCommand,{bookingId:id}),1);});
  await assert.rejects(service.create(ids[3],input(slots[1])),{status:409}); // distinct start overlaps a 50-minute obligation
  await assert.rejects(service.create(ids[2],{...retry,durationMinutes:25,expectedPriceCents:1000}),{status:409});
  await assert.rejects(service.read(ids[3],id),{status:404});assert.equal((await service.read(ids[4],id,{},true)).booking.viewerRole,"administrator");
  await runtime.transaction(async em=>{await em.nativeDelete(UserRole,{userId:ids[4],role:"administrator"});});await assert.rejects(service.read(ids[4],id,{},true),{status:404});
  // Cross-role capacity: a developer in the first booking is now targeted as a mentor.
  const crossSlot=randomUUID();await runtime.transaction(async em=>{em.create(UserRole,{userId:ids[2],role:"mentor"});em.create(MentorProfile,{userId:ids[2],slug:"cross-role",publishedAt:now,price25Cents:1000,price50Cents:2000,stackTags:[]});em.create(Slot,{id:crossSlot,mentorProfileId:ids[2],startsAt:starts[1]});});
  await assert.rejects(service.create(ids[3],{...input(crossSlot),mentorSlug:"cross-role"}),{status:409});
  // Release/move is atomic, original id/terms are retained, same interval can be booked after the move.
  await assert.rejects(service.change(ids[0],id,"reschedule",{slotId:slots[3],requestId:randomUUID(),expectedVersion:1}),{status:403});
  const second=await service.create(ids[3],input(slots[2]));await assert.rejects(service.change(ids[2],id,"reschedule",{slotId:slots[2],requestId:randomUUID(),expectedVersion:1}),{status:409});assert.equal((await service.read(ids[2],id)).booking.startsAt,starts[0].toISOString());
  await runtime.transaction(async em=>{const profile=await em.findOneOrFail(MentorProfile,{userId:ids[0]});profile.price25Cents=5000;profile.price50Cents=6000;});
  const moveInput={slotId:slots[3],requestId:randomUUID(),expectedVersion:1};const moved=await service.change(ids[2],id,"reschedule",moveInput);assert.equal(moved.booking.priceCents,2000);assert.equal(moved.booking.version,2);
  // Retry lookup precedes mutable eligibility, including unpublication, role loss, removal and elapsed start.
  await new SlotRepository(runtime).remove(ids[0],slots[0],()=>clock,7200000);
  await runtime.transaction(async em=>{const profile=await em.findOneOrFail(MentorProfile,{userId:ids[0]});profile.publishedAt=null;await em.nativeDelete(UserRole,{userId:ids[0],role:"mentor"});});clock=new Date("2026-09-02T14:00:00Z");
  const replay=await service.create(ids[2],retry);assert.equal(replay.replayed,true);assert.equal(replay.appliedVersion,1);assert.equal(replay.booking.version,2);assert.equal(replay.booking.startsAt,starts[3].toISOString());
  const replayMove=await service.change(ids[2],id,"reschedule",moveInput);assert.equal(replayMove.replayed,true);
  await assert.rejects(service.change(ids[0],id,"complete",{requestId:randomUUID(),expectedVersion:2,confirmation:true}),{status:403});
  const races=await Promise.allSettled([service.change(ids[0],id,"cancel",{reason:"Private <script>reason</script>",requestId:randomUUID(),expectedVersion:2}),service.change(ids[2],id,"complete",{confirmation:true,requestId:randomUUID(),expectedVersion:2})]);assert.equal(races.filter(r=>r.status==="fulfilled").length,1);assert.equal(races.filter(r=>r.status==="rejected"&&r.reason.status===409).length,1);
  const terminal=await service.read(ids[2],id);assert.equal(terminal.booking.version,3);assert.equal(terminal.events.length,3);assert.deepEqual(terminal.booking.allowedActions,{cancel:false,reschedule:false,complete:false});
  await assert.rejects(orm.migrator.down({to:"Migration202611030001"}),/Refusing destructive booking rollback/);
  await runtime.withEntityManager(async em=>{await assert.rejects(em.nativeDelete(User,{id:ids[0]}),/foreign key/i);await assert.rejects(em.nativeDelete(Slot,{id:slots[0]}),/foreign key/i);});
  // Recompute six months from a late cancellation, not from initial create or read time.
  const late=await service.change(ids[0],second.booking.id,"cancel",{reason:"After service time",requestId:randomUUID(),expectedVersion:1});assert.equal(late.booking.retentionExpiresAt,bookingRetention(new Date(second.booking.endsAt),clock).toISOString());
  clock=new Date(terminal.booking.retentionExpiresAt);await assert.rejects(service.read(ids[2],id),{status:404});await assert.rejects(service.create(ids[2],retry),{status:404});assert.equal((await service.list(ids[2],{view:"history"})).items.length,0);
  assert.ok(await service.maintain()>=1);await runtime.withEntityManager(async em=>{assert.equal(await em.count(Booking,{id}),0);assert.equal(await em.count(BookingEvent,{bookingId:id}),0);assert.equal(await em.count(BookingCommand,{bookingId:id}),0);});await assert.rejects(service.create(ids[2],retry),{status:409});
  const expiredEnd=new Date(Date.now()-400*86400000),expiredStart=new Date(expiredEnd.getTime()-25*60000),expiredRetention=bookingRetention(expiredEnd);
  await runtime.transaction(async em=>{await em.execute("insert into bookings(id,developer_user_id,mentor_user_id,slot_id,starts_at,ends_at,duration_minutes,price_cents,currency,status,version,created_at,updated_at,cancelled_at,retention_expires_at) select gen_random_uuid(),?,?,?, ?,?,25,1000,'PLN','cancelled',1,?,?,?,? from generate_series(1,501)",[ids[2],ids[0],slots[4],expiredStart,expiredEnd,expiredStart,expiredEnd,expiredEnd,expiredRetention]);});
  const execute=promisify(execFile),configuredUrl=orm.config.get("clientUrl");assert.ok(configuredUrl);const clientUrl=configuredUrl;
  async function runBatch(deleted:number):Promise<void>{const result:{stdout:string;stderr:string}=await execute("npm",["run","bookings:maintain"],{env:{...process.env,DATABASE_URL:clientUrl},timeout:integrationConfig.operatorCommandTimeoutMs});assert.ok(result.stdout.includes(JSON.stringify({event:"bookings.retention.completed",deleted})));assert.ok(!result.stderr.includes(clientUrl));}
  await runtime.transaction(async em=>{
   const expired={developerUserId:ids[2],retentionExpiresAt:{$lte:new Date()}};
   await em.findOneOrFail(Booking,expired,{lockMode:LockMode.PESSIMISTIC_WRITE,orderBy:{id:"asc"}});
   await runBatch(500);assert.equal(await em.count(Booking,expired),1);
  });
  await runBatch(1);await runBatch(0);
  assert.equal(await orm.schema.getUpdateSchemaSQL({wrap:false}),"");
  console.log("Booking DB passed: schema parity/guarded rollback, concurrent retries, distinct/cross-role interval conflict, authorization/revocation, immutable move with rollback, replay after mutable eligibility loss, cancel/complete race, private history and exact retention purge.");
 } finally {await runtime.transaction(async em=>{await em.nativeDelete(Booking,{$or:[{developerUserId:{$in:ids}},{mentorUserId:{$in:ids}}]});await em.nativeDelete(Slot,{mentorProfileId:{$in:ids}});await em.nativeDelete(MentorProfile,{userId:{$in:ids}});await em.nativeDelete(UserRole,{userId:{$in:ids}});await em.nativeDelete(User,{id:{$in:ids}});});}
}
