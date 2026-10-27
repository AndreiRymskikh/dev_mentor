import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createDatabaseRuntime,MentorProfileRepository,MentorProfile,User,UserRole } from "../../packages/db/src";
import { MentorProfileService } from "../../packages/core/src/services/mentors/mentor-profile.service";
export async function testMentorProfiles(runtime:ReturnType<typeof createDatabaseRuntime>) {
 const ids=[randomUUID(),randomUUID(),randomUUID()],now=new Date();let transactions=0;
 const observed={...runtime,transaction:async <T>(work:Parameters<typeof runtime.transaction<T>>[0])=>{transactions++;return runtime.transaction(work);}};
 const repository=new MentorProfileRepository(observed),service=new MentorProfileService(repository);
 await runtime.transaction(async em=>{for(const [index,id]of ids.entries()){em.create(User,{id,normalizedEmail:`profile-${id}@example.test`,displayName:"Same mentor",emailVerifiedAt:now,createdAt:now,updatedAt:now});em.create(UserRole,{userId:id,role:"developer"});if(index<2)em.create(UserRole,{userId:id,role:"mentor"});}});
 try {
  assert.equal((await service.getMine(ids[0])).slug,null);await runtime.withEntityManager(async em=>assert.equal(await em.count(MentorProfile,{userId:ids[0]}),0));
  await assert.rejects(service.getMine(ids[2]),{status:403});await assert.rejects(service.update(ids[2],{bio:"forged"}),{status:403});await assert.rejects(service.update(ids[0],{userId:ids[1],bio:"forged"}),{status:400});
  for(const id of ids.slice(0,2)){await service.update(id,{bio:"Partial"});await assert.rejects(service.publish(id),{status:422});await service.update(id,{publicWorkUrl:"https://github.com/example",bio:"Public experience",stackTags:["typescript","react","python","ai-agents"]});}
  transactions=0;const published=await Promise.all(ids.slice(0,2).map(id=>service.publish(id)));assert.notEqual(published[0].slug,published[1].slug);assert.ok(transactions>=3,"equal-name collision retries in a fresh transaction");
  const slug=published[0].slug!;const publicDto=await service.getPublicBySlug(slug);assert.deepEqual(Object.keys(publicDto).sort(),["displayName","publicWorkUrl","bio","stackTags","slug"].sort());assert.equal(publicDto.bio,"Public experience");
  const same=await Promise.all(Array.from({length:4},()=>service.publish(ids[0])));assert.ok(same.every(profile=>profile.slug===slug));
  await assert.rejects(service.update(ids[0],{bio:""}),{status:422});assert.equal((await service.getMine(ids[0])).bio,"Public experience");
  await runtime.transaction(async em=>{await em.nativeUpdate(User,{id:ids[0]},{displayName:"Renamed mentor"});});assert.equal((await service.getPublicBySlug(slug)).displayName,"Renamed mentor");assert.equal((await service.publish(ids[0])).slug,slug);
  await service.unpublish(ids[0]);await assert.rejects(service.getPublicBySlug(slug),{status:404});assert.equal((await service.publish(ids[0])).slug,slug);
  const finished:(string|null)[]=[];await Promise.all([service.publish(ids[0]).then(value=>{finished.push(value.publishedAt);}),service.unpublish(ids[0]).then(value=>{finished.push(value.publishedAt);})]);assert.equal((await service.getMine(ids[0])).publishedAt,finished.at(-1));
  await service.publish(ids[0]);await runtime.transaction(async em=>{await em.nativeDelete(UserRole,{userId:ids[0],role:"mentor"});});await assert.rejects(service.getPublicBySlug(slug),{status:404});await assert.rejects(service.getMine(ids[0]),{status:403});
  await assert.rejects(runtime.transaction(async em=>{await em.execute("update mentor_profiles set stack_tags = ARRAY['unknown']::text[] where user_id = ?",[ids[1]]);}),/check constraint/);
  await assert.rejects((await runtime.getOrm()).migrator.down(),/Refusing destructive profile rollback/);
  console.log("Mentor profile DB passed: virtual self-service drafts, ownership, readiness, fresh-transaction slug collision retry, stable links, publish/unpublish serialization and private projection.");
 }finally{await runtime.transaction(async em=>{await em.nativeDelete(MentorProfile,{userId:{$in:ids}});await em.nativeDelete(UserRole,{userId:{$in:ids}});await em.nativeDelete(User,{id:{$in:ids}});});}
}
