import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { RolesRepository, RegistrationRepository, SessionRepository, User, UserRole, createDatabaseRuntime } from "../../packages/db/src";
import { integrationConfig as config } from "./config";
type Runtime=ReturnType<typeof createDatabaseRuntime>;
export async function testRoles(runtime:Runtime, clientUrl:string) {
  const repo=new RolesRepository(runtime), registration=new RegistrationRepository(runtime),sessions=new SessionRepository(runtime);const hash="$2b$12$"+"a".repeat(53);
  async function account(verified=true){const id=await registration.create({normalizedEmail:`roles-${randomUUID()}@example.test`,displayName:"Roles",passwordHash:hash,verificationDigest:randomUUID().replaceAll("-","").padEnd(64,"a"),verificationExpiresAt:new Date(Date.now()+86400000)});assert.ok(id);if(verified)await runtime.transaction(async em=>{await em.nativeUpdate(User,{id},{emailVerifiedAt:new Date()});});return id;}
  const first=await account(),second=await account(),unverified=await account(false);const sid=randomUUID();await sessions.create(first,hash,sid,new Date(Date.now()+86400000));
  assert.equal((await repo.enrollMentor(unverified)).status,"forbidden");const enrolled=await Promise.all(Array.from({length:8},()=>repo.enrollMentor(first)));assert.ok(enrolled.every(result=>result.status==="ok"));await runtime.withEntityManager(async em=>assert.equal(await em.count(UserRole,{userId:first,role:"mentor"}),1));
  // Real operator subprocess, UUID-only input, no database credentials in retained diagnostics.
  const execute=promisify(execFile);
  const cli=async(id:string)=>{let result;try {result=await execute("npm",["run","auth:bootstrap-admin","--",id],{env:{...process.env,DATABASE_URL:clientUrl},timeout:config.operatorCommandTimeoutMs});}catch(error){assert.equal((error as {code?:number}).code,1);return 1;}assert.match(result.stdout,/Administrator membership confirmed/);return 0;};
  assert.equal(await cli(unverified),1);assert.equal(await cli(randomUUID()),1);assert.equal(await cli(first),0);assert.equal(await cli(first),0);assert.equal(await cli(second),1);
  await runtime.transaction(async em=>{await em.nativeDelete(UserRole,{userId:first,role:"administrator"});});
  let bootstrapLocked!:()=>void,bootstrapRelease!:()=>void;const bootstrapReady=new Promise<void>(resolve=>{bootstrapLocked=resolve;}),bootstrapProceed=new Promise<void>(resolve=>{bootstrapRelease=resolve;});
  const bootstrapHolding=new RolesRepository({...runtime,transaction:async work=>runtime.transaction(async em=>{const result=await work(em);bootstrapLocked();await bootstrapProceed;return result;})});
  const firstBootstrap=bootstrapHolding.bootstrap(first);await bootstrapReady;
  let bootstrapIdentify!:(pid:number)=>void;const bootstrapIdentity=new Promise<number>(resolve=>{bootstrapIdentify=resolve;});
  const bootstrapObserved=new RolesRepository({...runtime,transaction:async work=>runtime.transaction(async em=>{const [row]=await em.execute<{pid:number}[]>("select pg_backend_pid() as pid");bootstrapIdentify(row.pid);return work(em);})});
  const secondBootstrap=bootstrapObserved.bootstrap(second);
  try {const pid=await bootstrapIdentity;let blocked=false;const deadline=Date.now()+config.sessionLockTimeoutMs;while(Date.now()<deadline){blocked=await runtime.withEntityManager(async em=>{const [row]=await em.execute<{blocked:boolean}[]>("select cardinality(pg_blocking_pids(?)) > 0 as blocked",[pid]);return row.blocked;});if(blocked)break;await delay(config.readinessIntervalMs);}assert.equal(blocked,true,"bootstrap must serialize first administrator creation");}finally{bootstrapRelease();}
  assert.equal((await firstBootstrap).status,"ok");assert.equal((await secondBootstrap).status,"conflict");
  assert.equal(await cli(first.toUpperCase()),0);
  assert.ok((await sessions.resolve(first,sid))?.roles.includes("administrator"));
  // Grant to an unverified account does not make that account a usable replacement.
  assert.equal((await repo.setRoles(first,unverified,{mentor:false,administrator:true})).status,"ok");assert.equal((await repo.setRoles(first,first,{mentor:true,administrator:false})).status,"conflict");
  assert.equal((await repo.setRoles(first,unverified,{mentor:false,administrator:false})).status,"ok");
  assert.equal((await repo.setRoles(first,second,{mentor:false,administrator:true})).status,"ok");
  const demotions=await Promise.all([repo.setRoles(first,first,{mentor:true,administrator:false}),repo.setRoles(second,second,{mentor:false,administrator:false})]);assert.equal(demotions.filter(result=>result.status==="ok").length,1);assert.equal(demotions.filter(result=>result.status==="conflict").length,1);
  const current=await runtime.withEntityManager(async em=>(await em.findOneOrFail(UserRole,{role:"administrator"})).userId);const former=current===first?second:first;
  assert.equal((await repo.setRoles(former,current,{mentor:false,administrator:false})).status,"forbidden");
  assert.equal((await repo.setRoles(current,randomUUID(),{mentor:false,administrator:false})).status,"not-found");
  assert.equal((await repo.setRoles(current,former,{mentor:false,administrator:true})).status,"ok");
  // Hold the exact transaction's advisory lock after it revokes an actor, then
  // prove the actor's actual subsequent repository operation blocks and rechecks.
  let locked!:()=>void,release!:()=>void;const ready=new Promise<void>(resolve=>{locked=resolve;}),proceed=new Promise<void>(resolve=>{release=resolve;});
  const holding=new RolesRepository({...runtime,transaction:async work=>runtime.transaction(async em=>{const result=await work(em);locked();await proceed;return result;})});
  const revoke=holding.setRoles(current,former,{mentor:false,administrator:false});await ready;
  let identified!:(pid:number)=>void;const identifiedPromise=new Promise<number>(resolve=>{identified=resolve;});const observed=new RolesRepository({...runtime,transaction:async work=>runtime.transaction(async em=>{const [row]=await em.execute<{pid:number}[]>("select pg_backend_pid() as pid");identified(row.pid);return work(em);})});
  const stale=observed.setRoles(former,current,{mentor:true,administrator:false});
  try {const pid=await identifiedPromise;let blocked=false;const deadline=Date.now()+config.sessionLockTimeoutMs;while(Date.now()<deadline){blocked=await runtime.withEntityManager(async em=>{const [row]=await em.execute<{blocked:boolean}[]>("select cardinality(pg_blocking_pids(?)) > 0 as blocked",[pid]);return row.blocked;});if(blocked)break;await delay(config.readinessIntervalMs);}assert.equal(blocked,true,"stale admin mutation waits for revocation commit");}finally{release();}
  assert.equal((await revoke).status,"ok");assert.equal((await stale).status,"forbidden");assert.equal((await repo.setRoles(current,current,{mentor:false,administrator:false})).status,"conflict");
  const roles=(await sessions.resolve(first,sid))!.roles;assert.equal(roles.includes("administrator"),current===first);
  // Bootstrap and administrator changes share the same lock: parallel bootstrap
  // may only confirm the one existing administrator, never add another.
  const bootstrapResults=await Promise.all([repo.bootstrap(current),repo.bootstrap(former)]);assert.equal(bootstrapResults[0].status,"ok");assert.equal(bootstrapResults[1].status,"conflict");
  await runtime.withEntityManager(async em=>assert.equal(await em.count(UserRole,{role:"administrator"}),1));
  console.log("Roles DB passed: mentor idempotence, operator subprocess, current sessions, usable-last-admin and observed stale-actor serialization.");
}
