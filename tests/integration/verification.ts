import assert from "node:assert/strict";
import { randomUUID, randomBytes, createHash } from "node:crypto";
import { ActionToken, Credential, User, RegistrationRepository, VerificationRepository, createDatabaseRuntime } from "../../packages/db/src";

/** Caller owns an isolated disposable database; never connects to Compose. */
export async function testVerification(runtime: ReturnType<typeof createDatabaseRuntime>) {
  const registration = new RegistrationRepository(runtime); const verification = new VerificationRepository(runtime);
  const digest = () => createHash("sha256").update(randomBytes(32)).digest("hex");
  const future = () => new Date(Date.now() + 86400000);
  async function user(label: string) {
    const email = `verification-${label}-${randomUUID()}@example.test`; const token = digest();
    const id = await registration.create({ normalizedEmail: email, displayName: "Verification", passwordHash: "$2b$12$" + "a".repeat(53), verificationDigest: token, verificationExpiresAt: future() });
    assert.ok(id); return { email, id, token };
  }
  const account = await user("replacement"); const replacement = digest();
  assert.equal(await verification.issue(account.email, replacement, future()), account.id);
  assert.equal(await verification.confirm(account.token), false);
  const replay = await Promise.all(Array.from({ length: 8 }, () => verification.confirm(replacement)));
  assert.equal(replay.filter(Boolean).length, 1);
  await runtime.withEntityManager(async (em) => {
    assert.ok((await em.findOneOrFail(User, { id: account.id })).emailVerifiedAt);
    assert.equal(await em.count(ActionToken, { userId: account.id, consumedAt: null }), 0);
  });
  assert.equal(await verification.issue(account.email, digest(), future()), null);
  assert.equal(await verification.issue("verification-absent@example.test", digest(), future()), null);
  const credentialless = await user("credentialless");
  await runtime.transaction(async (em) => { await em.nativeDelete(Credential, { userId: credentialless.id }); });
  assert.equal(await verification.issue(credentialless.email, digest(), future()), null);
  const invalid = await user("invalid"); const expired = digest();
  await verification.issue(invalid.email, expired, new Date(Date.now() - 1)); assert.equal(await verification.confirm(expired), false);
  const wrongPurpose = digest();
  await runtime.transaction(async (em) => { em.create(ActionToken, { id: randomUUID(), userId: invalid.id, digest: wrongPurpose, purpose: "reset-password", expiresAt: future() }); });
  assert.equal(await verification.confirm(wrongPurpose), false);
  const failed = await user("delivery"); const first = digest(); const second = digest();
  await verification.issue(failed.email, first, future()); await verification.issue(failed.email, second, future());
  await verification.invalidate(failed.id, first); assert.equal(await verification.confirm(second), true);
  for (let index = 0; index < 6; index++) {
    const race = await user(`race-${index}`); const next = digest();
    const [issued, confirmed] = await Promise.all([verification.issue(race.email, next, future()), verification.confirm(race.token)]);
    await runtime.withEntityManager(async (em) => {
      const row = await em.findOneOrFail(User, { id: race.id }); const active = await em.find(ActionToken, { userId: race.id, purpose: "verify-email", consumedAt: null });
      if (confirmed) { assert.equal(issued, null); assert.ok(row.emailVerifiedAt); assert.equal(active.length, 0); }
      else { assert.equal(issued, race.id); assert.equal(row.emailVerifiedAt, null); assert.deepEqual(active.map((token) => token.digest), [next]); }
      assert.ok((await em.findOneOrFail(ActionToken, { digest: race.token })).consumedAt);
    });
    assert.equal(await verification.confirm(next), !confirmed);
  }
  console.log("Verification DB passed: atomic replacement, concurrent replay and issuance/consume races, expiry/purpose and conditional cleanup.");
}
