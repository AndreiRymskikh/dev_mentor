import assert from "node:assert/strict";
import { randomUUID, randomBytes, createHash } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { LockMode } from "@mikro-orm/postgresql";
import { integrationConfig as config } from "./config";
import { ActionToken, AuthSession, Credential, User, RegistrationRepository, PasswordRecoveryRepository, SessionRepository, createDatabaseRuntime } from "../../packages/db/src";

/** Only the caller's disposable database is used. */
export async function testPasswordRecovery(runtime: ReturnType<typeof createDatabaseRuntime>) {
  const registration = new RegistrationRepository(runtime);
  const recovery = new PasswordRecoveryRepository(runtime);
  const sessions = new SessionRepository(runtime);
  const oldHash = "$2b$12$" + "a".repeat(53);
  const newHash = "$2b$12$" + "b".repeat(53);
  const digest = () => createHash("sha256").update(randomBytes(32)).digest("hex");
  const future = () => new Date(Date.now() + 1800000);
  async function account(verified = true) {
    const email = `reset-${randomUUID()}@example.test`;
    const id = await registration.create({ normalizedEmail: email, displayName: "Recovery", passwordHash: oldHash, verificationDigest: digest(), verificationExpiresAt: future() });
    assert.ok(id);
    if (verified) await runtime.transaction(async em => { await em.nativeUpdate(User, { id }, { emailVerifiedAt: new Date() }); });
    return { id, email };
  }
  const user = await account();
  const first = digest(); const replacement = digest();
  const sids = [randomUUID(), randomUUID()];
  for (const sid of sids) assert.ok(await sessions.create(user.id, oldHash, sid, future()));
  assert.equal(await recovery.issue(user.email, first, future()), user.id);
  assert.equal(await recovery.issue(user.email, replacement, future()), user.id);
  assert.equal(await recovery.eligible(first), false);
  assert.equal(await recovery.reset(first, newHash), false);
  await recovery.invalidate(user.id, first);
  assert.equal(await recovery.eligible(replacement), true);
  const replay = await Promise.all(Array.from({ length: 8 }, () => recovery.reset(replacement, newHash)));
  assert.equal(replay.filter(Boolean).length, 1);
  assert.equal(await recovery.eligible(replacement), false);
  for (const sid of sids) assert.equal(await sessions.resolve(user.id, sid), null);
  await runtime.withEntityManager(async em => {
    const credential = await em.findOneOrFail(Credential, { userId: user.id });
    const row = await em.findOneOrFail(User, { id: user.id });
    assert.equal(credential.passwordHash, newHash);
    assert.equal(credential.passwordChangedAt.getTime(), row.updatedAt.getTime());
    assert.ok(row.emailVerifiedAt);
    assert.equal(await em.count(AuthSession, { userId: user.id }), 2, "reset never creates a session");
  });
  const unverified = await account(false); const token = digest();
  await recovery.issue(unverified.email, token, future());
  assert.equal(await recovery.reset(token, newHash), true);
  await runtime.withEntityManager(async em => { assert.equal((await em.findOneOrFail(User, { id: unverified.id })).emailVerifiedAt, null); });
  assert.equal(await sessions.create(unverified.id, newHash, randomUUID(), future()), null);
  const credentialless = await account(); const removedToken = digest();
  await recovery.issue(credentialless.email, removedToken, future());
  await runtime.transaction(async em => { await em.nativeDelete(Credential, { userId: credentialless.id }); });
  assert.equal(await recovery.issue(credentialless.email, digest(), future()), null);
  assert.equal(await recovery.eligible(removedToken), false);
  assert.equal(await recovery.reset(removedToken, newHash), false);
  assert.equal(await recovery.issue("reset-absent@example.test", digest(), future()), null);
  assert.equal(await recovery.reset(digest(), newHash), false);
  const expired = digest(); await recovery.issue(user.email, expired, new Date(Date.now() - 1));
  assert.equal(await recovery.eligible(expired), false);
  assert.equal(await recovery.reset(expired, newHash), false);
  const wrongPurpose = digest();
  await runtime.transaction(async em => { em.create(ActionToken, { id: randomUUID(), userId: user.id, digest: wrongPurpose, purpose: "verify-email", expiresAt: future() }); });
  assert.equal(await recovery.eligible(wrongPurpose), false);
  assert.equal(await recovery.reset(wrongPurpose, newHash), false);

  // Observe actual database blocking before releasing the shared User lock.
  // Both orderings prove no usable old-password session survives a committed reset.
  for (const firstOperation of ["reset", "login"] as const) {
    const raced = await account(); const resetDigest = digest(); const sid = randomUUID();
    await recovery.issue(raced.email, resetDigest, future());
    let signal!: () => void; const locked = new Promise<void>(resolve => { signal = resolve; });
    let release!: () => void; const proceed = new Promise<void>(resolve => { release = resolve; });
    let identify!: (pid: number) => void; const identity = new Promise<number>(resolve => { identify = resolve; });
    const heldRuntime = { ...runtime, transaction: async <T>(work: Parameters<typeof runtime.transaction<T>>[0]) => runtime.transaction(async em => {
      await em.findOneOrFail(User, { id: raced.id }, { lockMode: LockMode.PESSIMISTIC_WRITE });
      signal(); await proceed; return work(em);
    }) };
    const observedRuntime = { ...runtime, transaction: async <T>(work: Parameters<typeof runtime.transaction<T>>[0]) => runtime.transaction(async em => {
      const [row] = await em.execute<{ pid: number }[]>("select pg_backend_pid() as pid");
      identify(row.pid); return work(em);
    }) };
    const firstResult = firstOperation === "reset"
      ? new PasswordRecoveryRepository(heldRuntime).reset(resetDigest, newHash)
      : new SessionRepository(heldRuntime).create(raced.id, oldHash, sid, future());
    await locked;
    const secondResult = firstOperation === "reset"
      ? new SessionRepository(observedRuntime).create(raced.id, oldHash, sid, future())
      : new PasswordRecoveryRepository(observedRuntime).reset(resetDigest, newHash);
    try {
      const pid = await identity; const deadline = Date.now() + config.sessionLockTimeoutMs;
      let blocked = false;
      while (Date.now() < deadline) {
        blocked = await runtime.withEntityManager(async em => {
          const [row] = await em.execute<{ blocked: boolean }[]>("select cardinality(pg_blocking_pids(?)) > 0 as blocked", [pid]);
          return row.blocked;
        });
        if (blocked) break;
        await delay(config.readinessIntervalMs);
      }
      assert.ok(blocked, `${firstOperation} must block the competing User mutation`);
    } finally { release(); }
    const [a, b] = await Promise.all([firstResult, secondResult]);
    if (firstOperation === "reset") { assert.equal(a, true); assert.equal(b, null); }
    else { assert.ok(a); assert.equal(b, true); }
    assert.equal(await sessions.resolve(raced.id, sid), null);
    await runtime.withEntityManager(async em => {
      assert.equal((await em.findOneOrFail(Credential, { userId: raced.id })).passwordHash, newHash);
      assert.equal(await em.count(AuthSession, { userId: raced.id, revokedAt: null }), 0);
    });
  }
  console.log("Password recovery DB passed: replacement/replay, conditional cleanup, expiry/purpose, existing credentials only, unchanged verification, all-session revocation and observed reset/login races in both orders.");
}
