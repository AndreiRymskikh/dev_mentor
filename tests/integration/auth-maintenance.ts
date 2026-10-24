import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { AuthMaintenanceRepository, type createDatabaseRuntime } from "../../packages/db/src";
import { integrationConfig as config } from "./config";

/** This runtime is always backed by the runner-owned disposable PostgreSQL. */
export async function testAuthMaintenance(runtime: ReturnType<typeof createDatabaseRuntime>, clientUrl: string) {
  const em = (await runtime.getOrm()).em.fork();
  // Existing test records may also expire; isolate exact counts before seeding.
  await em.execute("delete from auth_sessions");
  await em.execute("delete from action_tokens");
  await em.execute("delete from rate_limit_buckets");
  const userId = randomUUID(), activeSession = randomUUID(), activeToken = randomUUID();
  await em.execute("insert into users(id,normalized_email,display_name,created_at,updated_at) values(?,?,'Maintenance fixture',now(),now())", [userId, `${userId}@example.test`]);
  await em.execute("insert into user_roles(user_id,role) values(?,'developer')", [userId]);
  await em.execute("insert into credentials(user_id,password_hash,password_changed_at) values(?,?,now())", [userId, "$2b$12$" + "a".repeat(53)]);
  await em.execute("insert into auth_sessions(id,user_id,expires_at) select gen_random_uuid(),?,now()-interval '1 hour' from generate_series(1,501)", [userId]);
  await em.execute("insert into action_tokens(id,user_id,purpose,digest,expires_at) select gen_random_uuid(),?,'verify-email',lpad(to_hex(i),64,'0'),now()-interval '1 hour' from generate_series(1,501) i", [userId]);
  await em.execute("insert into rate_limit_buckets(key_digest,window_start,attempt_count,expires_at) select lpad(to_hex(i),64,'0'),now()-interval '1 hour',1,now()-interval '1 hour' from generate_series(1,501) i");
  // Revoked/consumed but unexpired records are retained; maintenance is expire-only.
  await em.execute("insert into auth_sessions(id,user_id,expires_at,revoked_at) values(?,?,now()+interval '1 day',now())", [activeSession,userId]);
  await em.execute("insert into action_tokens(id,user_id,purpose,digest,expires_at,consumed_at) values(?,?,'reset-password',?,now()+interval '1 day',now())", [activeToken,userId,"f".repeat(64)]);
  await em.execute("insert into rate_limit_buckets(key_digest,window_start,attempt_count,expires_at) values(?,now(),7,now()+interval '1 day')", ["f".repeat(64)]);
  const repo = new AuthMaintenanceRepository(runtime);
  // Hold expired rows in another transaction: cleanup must skip, never block or
  // remove rows currently owned by a token/session operation.
  const locker = (await runtime.getOrm()).em.fork();
  await locker.begin();
  let lockedSession: string, lockedToken: string;
  try {
    [ { id: lockedSession } ] = await locker.execute<{id:string}[]>("select id from auth_sessions where expires_at<now() order by expires_at,id limit 1 for update");
    [ { id: lockedToken } ] = await locker.execute<{id:string}[]>("select id from action_tokens where expires_at<now() order by expires_at,id limit 1 for update");
    assert.deepEqual(await repo.removeExpired(), {sessions:500,tokens:500,buckets:500});
    assert.equal((await em.execute<{count:number}[]>("select count(*)::int count from auth_sessions where id=?",[lockedSession]))[0].count,1);
    assert.equal((await em.execute<{count:number}[]>("select count(*)::int count from action_tokens where id=?",[lockedToken]))[0].count,1);
  } finally { await locker.rollback(); }
  assert.deepEqual(await repo.removeExpired(), {sessions:1,tokens:1,buckets:1});
  assert.deepEqual(await repo.removeExpired(), {sessions:0,tokens:0,buckets:0});
  await em.execute("insert into auth_sessions(id,user_id,expires_at) select gen_random_uuid(),?,now()-interval '1 hour' from generate_series(1,600)", [userId]);
  await em.execute("insert into action_tokens(id,user_id,purpose,digest,expires_at) select gen_random_uuid(),?,'verify-email',lpad(to_hex(i),64,'0'),now()-interval '1 hour' from generate_series(1,600) i", [userId]);
  await em.execute("insert into rate_limit_buckets(key_digest,window_start,attempt_count,expires_at) select lpad(to_hex(i),64,'0'),now()-interval '1 hour',1,now()-interval '1 hour' from generate_series(1,600) i");
  const results=await Promise.all([repo.removeExpired(),repo.removeExpired()]);
  for (const table of ["sessions", "tokens", "buckets"] as const) {
    assert.equal(results.reduce((total, result) => total + result[table], 0), 600);
    assert.ok(results.every(result => result[table] >= 100 && result[table] <= 500));
  }
  assert.deepEqual(await repo.removeExpired(), {sessions:0,tokens:0,buckets:0});
  for(const table of ["users","user_roles","credentials","auth_sessions","action_tokens","rate_limit_buckets"] as const) {
    // Table names are fixed test constants, never external input.
    const counts = await em.execute<{count:number}[]>(table === "users" ? "select count(*)::int count from users where id=?" : table === "user_roles" ? "select count(*)::int count from user_roles where user_id=?" : table === "credentials" ? "select count(*)::int count from credentials where user_id=?" : table === "auth_sessions" ? "select count(*)::int count from auth_sessions where id=?" : table === "action_tokens" ? "select count(*)::int count from action_tokens where id=?" : "select count(*)::int count from rate_limit_buckets where key_digest=?", [table === "auth_sessions" ? activeSession : table === "action_tokens" ? activeToken : table === "rate_limit_buckets" ? "f".repeat(64) : userId]);
    assert.equal(counts[0].count,1);
  }
  const execute=promisify(execFile);
  const command=await execute("npm",["run","auth:maintain"],{env:{...process.env,DATABASE_URL:clientUrl},timeout:config.operatorCommandTimeoutMs});
  assert.match(command.stdout,/sessions=0, tokens=0, buckets=0/);
  await assert.rejects(execute("npm",["run","auth:maintain","--","--all"],{env:{...process.env,DATABASE_URL:clientUrl},timeout:config.operatorCommandTimeoutMs}), /Command failed/);
  console.log("Auth maintenance passed: bounded expiry-only cleanup, locked-row preservation, concurrency, identity/active-record retention and real operator command.");
}
