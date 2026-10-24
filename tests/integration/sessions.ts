import { setTimeout as delay } from "node:timers/promises";
import { integrationConfig as config } from "./config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { LockMode } from "@mikro-orm/postgresql";
import { AuthSession, User, UserRole, Credential, SessionRepository, RateLimitRepository, RegistrationRepository, createDatabaseRuntime } from "../../packages/db/src";
export async function testSessions(runtime: ReturnType<typeof createDatabaseRuntime>) {
  const repo = new SessionRepository(runtime); const reg = new RegistrationRepository(runtime); const hash = "$2b$12$"+"a".repeat(53);
  const email = `sessions-${randomUUID()}@example.test`; const uid = await reg.create({normalizedEmail:email,displayName:"Sessions",passwordHash:hash,verificationDigest:"a".repeat(64),verificationExpiresAt:new Date(Date.now()+86400000)});assert.ok(uid);
  const expires = new Date(Date.now()+86400000); const sid = randomUUID();
  assert.equal(await repo.create(uid,hash,sid,expires),null);
  await runtime.transaction(async em=>{await em.nativeUpdate(User,{id:uid},{emailVerifiedAt:new Date()});});
  assert.deepEqual(await repo.credentials(email),{userId:uid,passwordHash:hash});
  assert.deepEqual(await repo.create(uid,hash,sid,expires),{id:uid,displayName:"Sessions",roles:["developer"]});
  assert.deepEqual((await repo.resolve(uid,sid))?.roles,["developer"]);
  await runtime.transaction(async em=>{em.create(UserRole,{userId:uid,role:"mentor"});});
  assert.deepEqual([...(await repo.resolve(uid,sid))!.roles].sort(),["developer","mentor"]);
  await repo.revoke(uid,sid); await repo.revoke(uid,sid); assert.equal(await repo.resolve(uid,sid),null);
  const expired=randomUUID();await repo.create(uid,hash,expired,new Date(Date.now()-1));assert.equal(await repo.resolve(uid,expired),null);
  // Reset holds the same User lock. A login with an earlier snapshot must wait,
  // reread the committed credential, and decline creating its session.
  let signal!:()=>void; const locked=new Promise<void>(resolve=>{signal=resolve;});let release!:()=>void;const proceed=new Promise<void>(resolve=>{release=resolve;});
  const reset=runtime.transaction(async em=>{await em.findOneOrFail(User,{id:uid},{lockMode:LockMode.PESSIMISTIC_WRITE});signal();await proceed;await em.nativeUpdate(Credential,{userId:uid},{passwordHash:"$2b$12$"+"b".repeat(53)});await em.nativeUpdate(AuthSession,{userId:uid},{revokedAt:new Date()});});
  await locked; const raceId=randomUUID();
  let identify!:(pid:number)=>void;const identity=new Promise<number>(resolve=>{identify=resolve;});
  const observed = new SessionRepository({...runtime, transaction: async work => runtime.transaction(async em=>{const [row]=await em.execute<{pid:number}[]>("select pg_backend_pid() as pid");identify(row.pid);return work(em);})});
  const login=observed.create(uid,hash,raceId,expires);
  try {
    const pid=await identity;const deadline=Date.now()+config.sessionLockTimeoutMs;let blocked=false;
    while(Date.now()<deadline){blocked=await runtime.withEntityManager(async em=>{const [row]=await em.execute<{blocked:boolean}[]>("select cardinality(pg_blocking_pids(?)) > 0 as blocked",[pid]);return row.blocked;});if(blocked)break;await delay(config.readinessIntervalMs);}
    assert.equal(blocked,true,"login must wait on the User lock held by reset");
  } finally {release();}
  await reset;assert.equal(await login,null);
  await runtime.withEntityManager(async em=>{assert.equal(await em.count(AuthSession,{id:raceId}),0);});
  await runtime.transaction(async em=>{await em.nativeDelete(AuthSession,{userId:uid});});
  const quota = new RateLimitRepository(runtime); const quotaKey = randomUUID().replaceAll("-","").padEnd(64,"a");
  const attempts = await Promise.all(Array.from({length:55},()=>quota.consume([{keyDigest:quotaKey,limit:50,windowSeconds:900}])));assert.equal(attempts.filter(value=>value.allowed).length,50);assert.ok(attempts.every(value=>value.retryAfterSeconds>=1&&value.retryAfterSeconds<=900));
  console.log("Sessions DB passed: current roles, verification, revocation, expiry and stale hash serialized against credential replacement.");
}
