import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createDatabaseRuntime, InvitationRepository, Invitation, MentorProfile, User, UserRole, AuthSession, SessionRepository } from "../../packages/db/src";

export async function testInvitations(runtime: ReturnType<typeof createDatabaseRuntime>) {
  const repository=new InvitationRepository(runtime), sessions=new SessionRepository(runtime);
  const id=randomUUID(), other=randomUUID(), sessionId=randomUUID(), now=new Date(), expiresAt=new Date(now.getTime()+86400000), due=new Date(now.getTime()+14*86400000), email=`invite-${id}@example.test`, digest="1".repeat(64);
  await runtime.transaction(async em=>{
    for(const [userId,address] of [[id,email],[other,`other-${id}@example.test`]]) {em.create(User,{id:userId,normalizedEmail:address,displayName:"Invited",emailVerifiedAt:now,createdAt:now,updatedAt:now});em.create(UserRole,{userId,role:"developer"});}
    em.create(AuthSession,{id:sessionId,userId:id,expiresAt});
  });
  try {
    const record={id:randomUUID(),email,tokenHash:digest,stackTags:["react"],createdAt:now,expiresAt};
    const creates=await Promise.all([repository.create(record),repository.create({...record,id:randomUUID(),tokenHash:"2".repeat(64)})]);assert.deepEqual(creates.sort(),["conflict","ok"]);
    const invitation=await runtime.withEntityManager(em=>em.findOneOrFail(Invitation,{email}));
    const hash=invitation.tokenHash;
    assert.equal(await repository.accept(other,hash,now,due),"forbidden");
    await runtime.withEntityManager(async em=>{assert.equal(await em.count(MentorProfile,{userId:other}),0);assert.equal(await em.count(UserRole,{userId:other,role:"mentor"}),0);});
    await runtime.transaction(async em=>{await em.nativeUpdate(User,{id},{emailVerifiedAt:null});});assert.equal(await repository.accept(id,hash,now,due),"forbidden");await runtime.transaction(async em=>{await em.nativeUpdate(User,{id},{emailVerifiedAt:now});});
    assert.deepEqual((await Promise.all([repository.accept(id,hash,now,due),repository.accept(id,hash,now,due)])).sort(),["not-found","ok"]);
    assert.deepEqual((await sessions.resolve(id,sessionId))?.roles.slice().sort(),["developer","mentor"]);
    assert.equal(await repository.lookup(hash,now),null);assert.equal(await repository.change(invitation.id,now),"not-found");assert.equal(await repository.change(invitation.id,now,{tokenHash:"3".repeat(64),expiresAt}),"not-found");
    assert.deepEqual(await repository.onboarding(id),{initialPublishDueAt:due.toISOString()});assert.equal(await repository.create({...record,id:randomUUID(),tokenHash:"4".repeat(64)}),"conflict");
    await runtime.transaction(async em=>{await em.nativeDelete(UserRole,{userId:id,role:"mentor"});});
    const pendingId=randomUUID();assert.equal(await repository.create({...record,id:pendingId,tokenHash:"5".repeat(64)}),"ok");
    assert.equal(await repository.change(pendingId,now,{tokenHash:"6".repeat(64),expiresAt}),"ok");assert.equal(await repository.lookup("5".repeat(64),now),null);
    const race=await Promise.all([repository.accept(id,"6".repeat(64),now,expiresAt),repository.change(pendingId,now)]);assert.equal(race.filter(value=>value==="ok").length,1);assert.equal(race.filter(value=>value==="not-found").length,1);
    assert.deepEqual(await runtime.withEntityManager(async em=>(await em.findOneOrFail(MentorProfile,{userId:id})).initialPublishDueAt),due);
    const pending=await runtime.withEntityManager(em=>em.findOne(Invitation,{email,acceptedAt:null,revokedAt:null}));assert.equal(pending,null);
    await assert.rejects((await runtime.getOrm()).migrator.down({to:0}),/Refusing destructive mentor rollback/);
  } finally {
    await runtime.transaction(async em=>{await em.nativeDelete(Invitation,{email});await em.nativeDelete(MentorProfile,{userId:id});await em.nativeDelete(AuthSession,{userId:id});await em.nativeDelete(UserRole,{userId:{$in:[id,other]}});await em.nativeDelete(User,{id:{$in:[id,other]}});});
  }
}
