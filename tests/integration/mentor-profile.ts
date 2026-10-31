import assert from "node:assert/strict";
import { LockMode } from "@mikro-orm/postgresql";
import { randomUUID } from "node:crypto";
import { createDatabaseRuntime,MentorProfileRepository,MentorProfile,User,UserRole,AdminUsersRepository,SessionRepository,AuthSession } from "../../packages/db/src";
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
  const slug=published[0].slug!;const publicDto=await service.getPublicBySlug(slug);assert.deepEqual(Object.keys((await repository.publicBySlug(slug))!).sort(),["displayName","publicWorkUrl","bio","stackTags","slug"].sort());assert.deepEqual(Object.keys(publicDto).sort(),["displayName","publicWorkUrl","bio","stackTags","slug"].sort());assert.equal(publicDto.bio,"Public experience");
  const same=await Promise.all(Array.from({length:4},()=>service.publish(ids[0])));assert.ok(same.every(profile=>profile.slug===slug));
  await assert.rejects(service.update(ids[0],{displayName:"Must roll back",bio:""}),{status:422});assert.equal((await service.getMine(ids[0])).bio,"Public experience");
  assert.equal((await service.getMine(ids[0])).displayName,"Same mentor");
  await service.update(ids[0],{displayName:"  Renamed mentor  "});await runtime.withEntityManager(async em=>{const user=await em.findOneOrFail(User,{id:ids[0]});assert.equal(user.displayName,"Renamed mentor");assert.ok(user.emailVerifiedAt);assert.equal(await em.count(UserRole,{userId:ids[0]}),2);});
  const sessionId=randomUUID();await runtime.transaction(async em=>{em.create(UserRole,{userId:ids[2],role:"administrator"});em.create(AuthSession,{id:sessionId,userId:ids[0],expiresAt:new Date(Date.now()+60_000)});});
  assert.equal((await new SessionRepository(runtime).resolve(ids[0],sessionId))?.displayName,"Renamed mentor");assert.equal((await new AdminUsersRepository(runtime).list(ids[2],{page:1,pageSize:20,q:"renamed mentor"}))?.items.find(user=>user.id===ids[0])?.displayName,"Renamed mentor");
  await service.update(ids[0],{bio:"Public experience"});assert.equal((await service.getMine(ids[0])).displayName,"Renamed mentor");assert.equal((await service.getPublicBySlug(slug)).displayName,"Renamed mentor");assert.equal((await service.publish(ids[0])).slug,slug);
  await service.unpublish(ids[0]);await assert.rejects(service.getPublicBySlug(slug),{status:404});assert.equal((await service.publish(ids[0])).slug,slug);
  const finished:(string|null)[]=[];await Promise.all([service.publish(ids[0]).then(value=>{finished.push(value.publishedAt);}),service.unpublish(ids[0]).then(value=>{finished.push(value.publishedAt);})]);assert.equal((await service.getMine(ids[0])).publishedAt,finished.at(-1));
  await service.publish(ids[0]);
  let acquired!:()=>void,release!:()=>void;const locked=new Promise<void>(resolve=>{acquired=resolve;}),unlock=new Promise<void>(resolve=>{release=resolve;});
  const removal=runtime.transaction(async em=>{await em.findOneOrFail(User,{id:ids[0]},{lockMode:LockMode.PESSIMISTIC_WRITE});await em.nativeDelete(UserRole,{userId:ids[0],role:"mentor"});acquired();await unlock;});
  await locked;const deniedUpdate=assert.rejects(service.update(ids[0],{displayName:"Concurrent denied name"}),{status:403});release();await Promise.all([removal,deniedUpdate]);await assert.rejects(service.getPublicBySlug(slug),{status:404});await assert.rejects(service.getMine(ids[0]),{status:403});await assert.rejects(service.update(ids[0],{displayName:"Denied"}),{status:403});await runtime.withEntityManager(async em=>assert.equal((await em.findOneOrFail(User,{id:ids[0]})).displayName,"Renamed mentor"));
  await assert.rejects(runtime.transaction(async em=>{await em.execute("update mentor_profiles set stack_tags = ARRAY['unknown']::text[] where user_id = ?",[ids[1]]);}),/check constraint/);
  await assert.rejects((await runtime.getOrm()).migrator.down(),/Refusing destructive profile rollback/);
  console.log("Mentor profile DB passed: virtual self-service drafts, ownership, readiness, fresh-transaction slug collision retry, stable links, publish/unpublish serialization and private projection.");
 }finally{await runtime.transaction(async em=>{await em.nativeDelete(AuthSession,{userId:{$in:ids}});await em.nativeDelete(MentorProfile,{userId:{$in:ids}});await em.nativeDelete(UserRole,{userId:{$in:ids}});await em.nativeDelete(User,{id:{$in:ids}});});}
}
