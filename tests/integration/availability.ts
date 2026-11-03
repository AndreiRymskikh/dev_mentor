import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import {createDatabaseRuntime,SlotRepository,Slot,MentorProfile,User,UserRole} from "../../packages/db/src";
import {SlotService,publicationLimit} from "../../packages/core/src/services/availability/slot.service";
import {MentorProfileService} from "../../packages/core/src/services/mentors/mentor-profile.service";
import {MentorProfileRepository} from "../../packages/db/src";
export async function testAvailability(runtime:ReturnType<typeof createDatabaseRuntime>) {
 const ids=[randomUUID(),randomUUID(),randomUUID()],now=new Date("2026-08-31T16:00:00.000Z");let clock=now;
 const repository=new SlotRepository(runtime),service=new SlotService(repository,()=>clock),profiles=new MentorProfileService(new MentorProfileRepository(runtime));
 await runtime.transaction(async em=>{for(const [index,id]of ids.entries()){em.create(User,{id,normalizedEmail:`slots-${id}@example.test`,displayName:`Slots ${index}`,emailVerifiedAt:now,createdAt:now,updatedAt:now});if(index!==2)em.create(UserRole,{userId:id,role:"mentor"});}});
 try {
  assert.equal((await service.getMine(ids[0])).availabilityComplete,false);
  await runtime.withEntityManager(async em=>assert.equal(await em.count(MentorProfile,{userId:ids[0]}),0));
  await assert.rejects(service.getMine(ids[2]),{status:403});await assert.rejects(service.publish(ids[2],{startsAt:"2026-08-31T18:00:00Z"}),{status:403});
  const input={startsAt:"2026-08-31T18:00:00.000Z"};
  const attempts=await Promise.allSettled(Array.from({length:8},(_,index)=>service.publish(ids[0],index%2?{startsAt:"2026-08-31T20:00:00+02:00"}:input)));
  assert.equal(attempts.filter(result=>result.status==="fulfilled").length,1);for(const result of attempts)if(result.status==="rejected")assert.equal(result.reason.status,409);
  const owner=await service.getMine(ids[0]);assert.equal(owner.availabilityComplete,true);assert.equal(owner.lastPublishedAvailabilityAt,now.toISOString());const slotId=owner.slots[0].id;
  await assert.rejects(service.remove(ids[1],slotId),{status:404});assert.equal((await service.getMine(ids[1])).slots.length,0);
  await assert.rejects(service.publish(ids[0],{...input,mentorProfileId:ids[1]}),{status:422});
  await profiles.update(ids[0],{publicWorkUrl:"https://example.test",bio:"Slot mentor",stackTags:["react"]});const published=await profiles.publish(ids[0]),slug=published.slug!;
  const publicData=await service.getPublicBySlug(slug);assert.deepEqual(Object.keys(publicData).sort(),["serverNow","refreshAt","slots","nextCursor"].sort());assert.deepEqual(Object.keys(publicData.slots[0]).sort(),["id","startsAt","eligible"].sort());assert.equal(publicData.slots[0].eligible,true);assert.ok(!JSON.stringify(publicData).includes(ids[0]));
  clock=new Date(now.getTime()+1);assert.equal((await service.getPublicBySlug(slug)).slots[0].eligible,false);assert.equal((await service.getMine(ids[0])).availabilityComplete,false);
  clock=new Date(input.startsAt);assert.equal((await service.getPublicBySlug(slug)).slots.length,0);assert.equal((await service.getMine(ids[0])).slots.length,0);assert.equal((await service.getMine(ids[0],{view:"all"})).slots.length,1);
  clock=now;await assert.rejects(service.publish(ids[0],{startsAt:now.toISOString()}),{status:422});await assert.rejects(service.publish(ids[0],{startsAt:new Date(publicationLimit(now).getTime()+1).toISOString()}),{status:422});
  await service.publish(ids[0],{startsAt:publicationLimit(now).toISOString()});
  await service.remove(ids[0],slotId);await service.publish(ids[0],input);await runtime.withEntityManager(async em=>assert.equal(await em.count(Slot,{mentorProfileId:ids[0],startsAt:new Date(input.startsAt)}),2));
  // Publish/remove race serializes on the owner; each permitted interleaving preserves the index/history.
  const current=(await service.getMine(ids[0])).slots.find(slot=>slot.startsAt===input.startsAt)!;
  const race=await Promise.allSettled([service.remove(ids[0],current.id),service.publish(ids[0],input)]);assert.equal(race[0].status,"fulfilled");
  if(race[1].status==="rejected")assert.equal(race[1].reason.status,409);
  const later=["2026-09-01T12:00:00Z","2026-09-02T12:00:00Z"];clock=new Date(now.getTime()+1000);await Promise.all(later.map(startsAt=>service.publish(ids[0],{startsAt})));assert.equal((await service.getMine(ids[0])).lastPublishedAvailabilityAt,clock.toISOString());
  // Response projection failure occurs before commit: both publication and removal roll back.
  const failingRuntime: typeof runtime = {...runtime, transaction: work => runtime.transaction(async em => {
    Object.defineProperty(em,"find",{value:async()=>{throw new Error("injected projection outage");}});
    return work(em);
  })};
  const failingService=new SlotService(new SlotRepository(failingRuntime),()=>clock),faultStart={startsAt:"2026-09-03T12:00:00.000Z"};
  await assert.rejects(failingService.publish(ids[1],faultStart),{status:503});
  await runtime.withEntityManager(async em=>{assert.equal(await em.count(Slot,{mentorProfileId:ids[1]}),0);assert.equal(await em.count(MentorProfile,{userId:ids[1]}),0);});
  // A post-commit read outage and a throwing observer cannot turn a committed write into failure.
  const noRead=new SlotRepository(runtime);noRead.read=async()=>{throw new Error("independent read unavailable");};
  const acknowledged=new SlotService(noRead,()=>clock,()=>{throw new Error("observer unavailable");});
  const saved=await acknowledged.publish(ids[1],faultStart),savedId=saved.slots[0].id;
  assert.equal(saved.lastPublishedAvailabilityAt,clock.toISOString());
  await assert.rejects(failingService.remove(ids[1],savedId),{status:503});
  assert.equal((await service.getMine(ids[1])).slots[0].id,savedId);
  assert.equal((await acknowledged.remove(ids[1],savedId)).slots.length,0);
  // Large past history is filtered in SQL; every returned page is bounded.
  await runtime.transaction(async em=>{
    await em.execute("insert into slots(id,mentor_profile_id,starts_at) select gen_random_uuid(),?,cast(? as timestamptz)-n*interval '1 second' from generate_series(1,5000) n",[ids[0],now]);
    await em.execute("insert into slots(id,mentor_profile_id,starts_at) select gen_random_uuid(),?,cast(? as timestamptz)+interval '1 minute'+n*interval '1 millisecond' from generate_series(1,105) n",[ids[0],now]);
  });
  const first=await service.getMine(ids[0]);assert.equal(first.slots.length,50);assert.ok(first.nextCursor);assert.equal(first.slots.every(slot=>!slot.eligible),true);assert.equal(first.availabilityComplete,true);assert.equal(first.refreshAt,new Date(now.getTime()+60001).toISOString());
  const publicFirst=await service.getPublicBySlug(slug);assert.equal(publicFirst.slots.length,50);assert.equal(publicFirst.nextCursor,first.nextCursor);
  let next:string|null=null;const seen:string[]=[],starts:string[]=[];
  do {const page=await service.getPublicBySlug(slug,{limit:17,...(next?{after:next}:{})});assert.ok(page.slots.length<=17);seen.push(...page.slots.map(slot=>slot.id));starts.push(...page.slots.map(slot=>slot.startsAt));next=page.nextCursor;} while(next);
  assert.equal(new Set(seen).size,seen.length);assert.deepEqual(starts,[...starts].sort());
  await runtime.withEntityManager(async em=>assert.equal(seen.length,await em.count(Slot,{mentorProfileId:ids[0],removedAt:null,startsAt:{$gt:clock}})));
  const all=await service.getMine(ids[0],{view:"all",limit:100});assert.equal(all.slots.length,100);assert.equal(all.slots.every(slot=>slot.startsAt<clock.toISOString()),true);assert.equal(all.availabilityComplete,true);assert.equal(all.refreshAt,first.refreshAt);
  assert.equal((await service.getMine(ids[1],{after:first.nextCursor})).slots.length,0);
  await assert.rejects(service.getMine(ids[0],{after:"invalid"}),{status:422});
  const boundedRecord=await repository.publicBySlug(slug,{limit:50,view:"future"},()=>clock,7200000);assert.equal(boundedRecord!.slots.length,50);
  const orm=await runtime.getOrm();await assert.rejects(orm.migrator.down(),/Refusing destructive availability rollback/);assert.equal(await orm.schema.getUpdateSchemaSQL({wrap:false}),"");
  await profiles.unpublish(ids[0]);await assert.rejects(service.getPublicBySlug(slug,{after:first.nextCursor}),{status:404});await profiles.publish(ids[0]);
  await runtime.transaction(async em=>{const user=await em.findOneOrFail(User,{id:ids[0]});user.emailVerifiedAt=null;});await assert.rejects(service.getPublicBySlug(slug),{status:404});
  await runtime.transaction(async em=>{const user=await em.findOneOrFail(User,{id:ids[0]});user.emailVerifiedAt=now;await em.nativeDelete(UserRole,{userId:ids[0],role:"mentor"});});await assert.rejects(service.getMine(ids[0]),{status:403});await assert.rejects(service.getPublicBySlug(slug),{status:404});await assert.rejects(service.remove(ids[0],slotId),{status:403});
  await runtime.transaction(async em=>{await em.nativeDelete(Slot,{mentorProfileId:ids[0]});});await assert.rejects(orm.migrator.down(),/availability history exists/);
  console.log("Availability DB passed: concurrent duplicate conflict, owner isolation, exact 2h/6-month boundaries, guarded rollback, expiration, removal/republish, atomic response rollback/acknowledgement, bounded historical/future pages, off-page progress/timing, private/revoked mentors and schema parity.");
 } finally {await runtime.transaction(async em=>{await em.nativeDelete(Slot,{mentorProfileId:{$in:ids}});await em.nativeDelete(MentorProfile,{userId:{$in:ids}});await em.nativeDelete(UserRole,{userId:{$in:ids}});await em.nativeDelete(User,{id:{$in:ids}});});}
}
