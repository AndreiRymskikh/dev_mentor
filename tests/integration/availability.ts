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
  const attempts=await Promise.allSettled(Array.from({length:8},()=>service.publish(ids[0],input)));
  assert.equal(attempts.filter(result=>result.status==="fulfilled").length,1);for(const result of attempts)if(result.status==="rejected")assert.equal(result.reason.status,409);
  const owner=await service.getMine(ids[0]);assert.equal(owner.availabilityComplete,true);assert.equal(owner.lastPublishedAvailabilityAt,now.toISOString());const slotId=owner.slots[0].id;
  await assert.rejects(service.remove(ids[1],slotId),{status:404});assert.equal((await service.getMine(ids[1])).slots.length,0);
  await assert.rejects(service.publish(ids[0],{...input,mentorProfileId:ids[1]}),{status:422});
  await profiles.update(ids[0],{publicWorkUrl:"https://example.test",bio:"Slot mentor",stackTags:["react"]});const published=await profiles.publish(ids[0]),slug=published.slug!;
  const publicData=await service.getPublicBySlug(slug);assert.deepEqual(Object.keys(publicData).sort(),["serverNow","refreshAt","slots"].sort());assert.deepEqual(Object.keys(publicData.slots[0]).sort(),["id","startsAt","eligible"].sort());assert.equal(publicData.slots[0].eligible,true);assert.ok(!JSON.stringify(publicData).includes(ids[0]));
  clock=new Date(now.getTime()+1);assert.equal((await service.getPublicBySlug(slug)).slots[0].eligible,false);assert.equal((await service.getMine(ids[0])).availabilityComplete,false);
  clock=new Date(input.startsAt);assert.equal((await service.getPublicBySlug(slug)).slots.length,0);assert.equal((await service.getMine(ids[0])).slots.length,1);
  clock=now;await assert.rejects(service.publish(ids[0],{startsAt:now.toISOString()}),{status:422});await assert.rejects(service.publish(ids[0],{startsAt:new Date(publicationLimit(now).getTime()+1).toISOString()}),{status:422});
  await service.publish(ids[0],{startsAt:publicationLimit(now).toISOString()});
  await service.remove(ids[0],slotId);await service.publish(ids[0],input);await runtime.withEntityManager(async em=>assert.equal(await em.count(Slot,{mentorProfileId:ids[0],startsAt:new Date(input.startsAt)}),2));
  // Publish/remove race serializes on the owner; each permitted interleaving preserves the index/history.
  const current=(await service.getMine(ids[0])).slots.find(slot=>slot.startsAt===input.startsAt)!;
  const race=await Promise.allSettled([service.remove(ids[0],current.id),service.publish(ids[0],input)]);assert.equal(race[0].status,"fulfilled");
  if(race[1].status==="rejected")assert.equal(race[1].reason.status,409);
  const later=["2026-09-01T12:00:00Z","2026-09-02T12:00:00Z"];clock=new Date(now.getTime()+1000);await Promise.all(later.map(startsAt=>service.publish(ids[0],{startsAt})));assert.equal((await service.getMine(ids[0])).lastPublishedAvailabilityAt,clock.toISOString());
  const orm=await runtime.getOrm();await assert.rejects(orm.migrator.down(),/Refusing destructive availability rollback/);assert.equal(await orm.schema.getUpdateSchemaSQL({wrap:false}),"");
  await profiles.unpublish(ids[0]);await assert.rejects(service.getPublicBySlug(slug),{status:404});await profiles.publish(ids[0]);
  await runtime.transaction(async em=>{const user=await em.findOneOrFail(User,{id:ids[0]});user.emailVerifiedAt=null;});await assert.rejects(service.getPublicBySlug(slug),{status:404});
  await runtime.transaction(async em=>{const user=await em.findOneOrFail(User,{id:ids[0]});user.emailVerifiedAt=now;await em.nativeDelete(UserRole,{userId:ids[0],role:"mentor"});});await assert.rejects(service.getMine(ids[0]),{status:403});await assert.rejects(service.getPublicBySlug(slug),{status:404});await assert.rejects(service.remove(ids[0],slotId),{status:403});
  await runtime.transaction(async em=>{await em.nativeDelete(Slot,{mentorProfileId:ids[0]});});await assert.rejects(orm.migrator.down(),/availability history exists/);
  console.log("Availability DB passed: concurrent duplicate conflict, owner isolation, exact 2h/6-month boundaries, guarded rollback, expiration, removal/republish, atomic history, private/revoked mentors and schema parity.");
 } finally {await runtime.transaction(async em=>{await em.nativeDelete(Slot,{mentorProfileId:{$in:ids}});await em.nativeDelete(MentorProfile,{userId:{$in:ids}});await em.nativeDelete(UserRole,{userId:{$in:ids}});await em.nativeDelete(User,{id:{$in:ids}});});}
}
