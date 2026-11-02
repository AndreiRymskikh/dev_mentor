import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createDatabaseRuntime, MentorDetailsRepository, MentorProfileRepository, User, UserRole, MentorProfile } from "../../packages/db/src";
import { MentorDetailsService } from "../../packages/core/src/services/mentors/mentor-details.service";
import { MentorProfileService } from "../../packages/core/src/services/mentors/mentor-profile.service";
export async function testMentorDetails(runtime:ReturnType<typeof createDatabaseRuntime>) {
 const ids=[randomUUID(),randomUUID(),randomUUID()],now=new Date(),service=new MentorDetailsService(new MentorDetailsRepository(runtime)),profiles=new MentorProfileService(new MentorProfileRepository(runtime));
 const rich={sessionLanguage:"en",mentorTimeZone:"Europe/Warsaw",helpTopics:[{title:"Types",description:"Explain constraints"}],sampleAnswer:{title:"Sample",intro:"A public example",codeExcerpt:"<script>unsafe()</script>",body:"Literal public answer"},sessionSteps:[{title:"Discuss",description:"Review the question"}]};
 await runtime.transaction(async em=>{for(const [i,id] of ids.entries()){em.create(User,{id,normalizedEmail:`details-${id}@example.test`,displayName:"Details mentor",emailVerifiedAt:i===2?null:now,createdAt:now,updatedAt:now});if(i!==1)em.create(UserRole,{userId:id,role:"mentor"});}});
 try {
  assert.equal((await service.getMine(ids[0])).sessionLanguage,null);await runtime.withEntityManager(async em=>assert.equal(await em.count(MentorProfile,{userId:ids[0]}),0));
  for(const id of ids.slice(1)){await assert.rejects(service.getMine(id),{status:403});await assert.rejects(service.update(id,{}),{status:403});}
  await service.update(ids[0],{...rich,sampleOwnershipConfirmed:true});assert.deepEqual(await service.getMine(ids[0]),rich);
  await assert.rejects(service.getPublicBySlug("details-mentor"),{status:404});await profiles.update(ids[0],{bio:"Existing core biography",publicWorkUrl:"https://example.test",stackTags:["react"]});const published=await profiles.publish(ids[0]),slug=published.slug!;
  assert.deepEqual(await service.getPublicBySlug(slug),rich);assert.deepEqual(Object.keys(await profiles.getPublicBySlug(slug)).sort(),["displayName","publicWorkUrl","bio","stackTags","slug"].sort());
  await service.update(ids[0],{mentorTimeZone:"UTC"});assert.equal((await service.getMine(ids[0])).sessionLanguage,"en");assert.equal((await service.getMine(ids[0])).sampleAnswer?.body,rich.sampleAnswer.body);
  await assert.rejects(service.update(ids[0],{sampleAnswer:rich.sampleAnswer}),{status:422});await assert.rejects(service.update(ids[0],{userId:ids[1]}),{status:422});
  await assert.rejects((await runtime.getOrm()).migrator.down({to:"Migration202610260002"}),/Refusing destructive details rollback/);assert.equal(await (await runtime.getOrm()).schema.getUpdateSchemaSQL({wrap:false}),"");
  await service.update(ids[0],{sessionLanguage:null,mentorTimeZone:null,sampleAnswer:null,helpTopics:[],sessionSteps:[]});assert.equal((await profiles.getMine(ids[0])).slug,slug);assert.ok((await profiles.getMine(ids[0])).publishedAt);
  for(const field of [{sessionLanguage:"en"},{mentorTimeZone:"UTC"},{helpTopics:rich.helpTopics},{sessionSteps:rich.sessionSteps},{sampleAnswer:rich.sampleAnswer,sampleOwnershipConfirmed:true}]) {
    await service.update(ids[0],field);await assert.rejects((await runtime.getOrm()).migrator.down({to:"Migration202610260002"}),/Refusing destructive details rollback/);await service.update(ids[0],{sessionLanguage:null,mentorTimeZone:null,sampleAnswer:null,helpTopics:[],sessionSteps:[]});
  }
  await service.update(ids[0],{...rich,sampleOwnershipConfirmed:true});await profiles.unpublish(ids[0]);await assert.rejects(service.getPublicBySlug(slug),{status:404});assert.equal((await service.getMine(ids[0])).sampleAnswer?.title,"Sample");await profiles.publish(ids[0]);
  await runtime.transaction(async em=>{await em.nativeDelete(UserRole,{userId:ids[0],role:"mentor"});});await assert.rejects(service.getPublicBySlug(slug),{status:404});await assert.rejects(service.update(ids[0],{sessionLanguage:"pl"}),{status:403});
  console.log("Mentor details DB passed: optional persistence, strict ownership, public privacy, draft/unpublish/revocation denial, unchanged core DTO and guarded rollback for each content field.");
 } finally {await runtime.transaction(async em=>{await em.nativeDelete(MentorProfile,{userId:{$in:ids}});await em.nativeDelete(UserRole,{userId:{$in:ids}});await em.nativeDelete(User,{id:{$in:ids}});});}
}
