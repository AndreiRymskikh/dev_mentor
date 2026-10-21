import { testRegistrationEmail } from "./registration-email";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { randomUUID } from "node:crypto";
import { createDatabaseRuntime, databaseOptions, User, UserRole, Credential, RegistrationRepository, RateLimitRepository } from "../../packages/db/src";

/** Only called with the runner-owned Testcontainers connection. */
export async function testDatabase(clientUrl: string) {
  const runtime = createDatabaseRuntime(() => ({ ...databaseOptions(), clientUrl }));
  const orm = await runtime.getOrm();
  try {
    await orm.migrator.up();
    await orm.migrator.down();
    await orm.migrator.up();
    assert.equal(await orm.schema.getUpdateSchemaSQL({ wrap: false }), "");
    assert.deepEqual(orm.getMetadata().get(UserRole).properties.userId.fieldNames, ["user_id"]);
    assert.deepEqual(orm.getMetadata().get(Credential).properties.userId.fieldNames, ["user_id"]);
    const seen = await Promise.all([1, 2].map(() => runtime.withEntityManager(async (em) => em)));
    assert.notEqual(seen[0], seen[1]);
    const id = randomUUID();
    const now = new Date();
    await assert.rejects(runtime.transaction(async (em) => {
      em.create(User, { id, normalizedEmail: "rollback@example.test", displayName: "Rollback", createdAt: now, updatedAt: now });
      await em.flush();
      throw new Error("intentional transaction rollback");
    }), /intentional transaction rollback/);
    await runtime.withEntityManager(async (em) => assert.equal(await em.count(User), 0));
    await runtime.transaction(async (em) => {
      em.create(User, { id, normalizedEmail: "operator@example.test", displayName: "Operator", createdAt: now, updatedAt: now });
    });
    await assert.rejects(orm.migrator.down(), /Refusing destructive auth rollback/);
    await runtime.withEntityManager(async (em) => assert.equal(await em.count(User), 1));
    await runtime.transaction(async (em) => {
      em.create(UserRole, { userId: id, role: "mentor" });
      em.create(Credential, { userId: id, passwordHash: "$2b$12$" + "a".repeat(53), passwordChangedAt: now });
    });
    await runtime.withEntityManager(async (em) => {
      assert.equal((await em.findOneOrFail(UserRole, { userId: id })).role, "mentor");
      assert.equal((await em.findOneOrFail(Credential, { userId: id })).passwordHash.length, 60);
      await em.nativeDelete(Credential, { userId: id });
      await em.nativeDelete(UserRole, { userId: id });
    });
    const sql = orm.em.fork();
    await assert.rejects(sql.execute("insert into users (id, normalized_email, display_name, created_at, updated_at) values (?, ?, ?, ?, ?)", [randomUUID(), "operator@example.test", "Duplicate", now, now]), /unique/i);
    await assert.rejects(sql.execute("insert into users (id, normalized_email, display_name, created_at, updated_at) values (?, ?, ?, ?, ?)", [randomUUID(), "UPPER@example.test", "Invalid", now, now]), /check constraint/i);
    await assert.rejects(sql.execute("insert into user_roles (user_id, role) values (?, ?)", [randomUUID(), "developer"]), /foreign key/i);
    await assert.rejects(sql.execute("insert into user_roles (user_id, role) values (?, ?)", [id, "owner"]), /check constraint/i);
    await sql.execute("insert into user_roles (user_id, role) values (?, ?)", [id, "developer"]);
    await assert.rejects(sql.execute("insert into user_roles (user_id, role) values (?, ?)", [id, "developer"]), /unique/i);
    await assert.rejects(sql.execute("delete from users where id = ?", [id]), /foreign key/i);
    await assert.rejects(sql.execute("insert into credentials (user_id, password_hash, password_changed_at) values (?, ?, ?)", [id, "$2b$10$" + "a".repeat(53), now]), /check constraint/i);
    await sql.execute("insert into credentials (user_id, password_hash, password_changed_at) values (?, ?, ?)", [id, "$2b$12$" + "a".repeat(53), now]);
    await assert.rejects(sql.execute("insert into credentials (user_id, password_hash, password_changed_at) values (?, ?, ?)", [id, "$2b$12$" + "b".repeat(53), now]), /unique/i);
    await sql.execute("insert into auth_sessions (id, user_id, expires_at) values (?, ?, ?)", [randomUUID(), id, now]);
    await assert.rejects(sql.execute("insert into auth_sessions (id, user_id, expires_at) values (?, ?, ?)", [randomUUID(), randomUUID(), now]), /foreign key/i);
    await sql.execute("insert into action_tokens (id, user_id, purpose, digest, expires_at) values (?, ?, ?, ?, ?)", [randomUUID(), id, "verify-email", "a".repeat(64), now]);
    await assert.rejects(sql.execute("insert into action_tokens (id, user_id, purpose, digest, expires_at) values (?, ?, ?, ?, ?)", [randomUUID(), id, "reset-password", "a".repeat(64), now]), /unique/i);
    await assert.rejects(sql.execute("insert into action_tokens (id, user_id, purpose, digest, expires_at) values (?, ?, ?, ?, ?)", [randomUUID(), id, "unknown", "b".repeat(64), now]), /check constraint/i);
    await assert.rejects(sql.execute("insert into action_tokens (id, user_id, purpose, digest, expires_at) values (?, ?, ?, ?, ?)", [randomUUID(), id, "verify-email", "raw-secret", now]), /check constraint/i);
    await sql.execute("insert into rate_limit_buckets (key_digest, window_start, attempt_count, expires_at) values (?, ?, ?, ?)", ["b".repeat(64), now, 1, now]);
    await assert.rejects(sql.execute("insert into rate_limit_buckets (key_digest, window_start, attempt_count, expires_at) values (?, ?, ?, ?)", ["b".repeat(64), now, 1, now]), /unique/i);
    await assert.rejects(sql.execute("insert into rate_limit_buckets (key_digest, window_start, attempt_count, expires_at) values (?, ?, ?, ?)", ["c".repeat(64), now, -1, now]), /check constraint/i);
    await assert.rejects(sql.execute("insert into rate_limit_buckets (key_digest, window_start, attempt_count, expires_at) values (?, ?, ?, ?)", ["raw-email@example.test", now, 1, now]), /check constraint/i);
    await sql.execute("delete from auth_sessions");
    await sql.execute("delete from action_tokens");
    await sql.execute("delete from credentials");
    await sql.execute("delete from user_roles");
    await sql.execute("delete from users");
    const registrations = new RegistrationRepository(runtime);
    const registration = { normalizedEmail: "race@example.test", displayName: "Race", passwordHash: "$2b$12$" + "a".repeat(53), verificationDigest: "c".repeat(64), verificationExpiresAt: new Date(Date.now() + 86400000) };
    const created = await Promise.all(Array.from({ length: 12 }, () => registrations.create(registration)));
    assert.equal(created.filter((value) => value !== null).length, 1);
    assert.equal(await registrations.create({ ...registration, displayName: "Attacker", passwordHash: "$2b$12$" + "z".repeat(53) }), null);
    await runtime.withEntityManager(async (em) => {
      assert.equal(await em.count(User), 1);
      assert.equal(await em.count(UserRole, { role: "developer" }), 1);
      assert.equal(await em.count(Credential), 1);
      assert.equal((await em.findOneOrFail(User, { normalizedEmail: registration.normalizedEmail })).displayName, "Race");
      assert.equal((await em.findOneOrFail(Credential, { userId: created.find((value) => value !== null)! })).passwordHash, registration.passwordHash);
    });
    await assert.rejects(registrations.create({ ...registration, normalizedEmail: "rollback-invalid@example.test", passwordHash: "invalid", verificationDigest: "8".repeat(64) }), /check constraint/i);
    await runtime.withEntityManager(async (em) => assert.equal(await em.count(User), 1));
    const limits = new RateLimitRepository(runtime);
    const secondRuntime = createDatabaseRuntime(() => ({ ...databaseOptions(), clientUrl }));
    let outcomes;
    try {
      const secondLimits = new RateLimitRepository(secondRuntime);
      outcomes = await Promise.all(Array.from({ length: 30 }, (_, attempt) => (attempt % 2 ? limits : secondLimits).consume([{ keyDigest: "d".repeat(64), limit: 10 }])));
    } finally { await secondRuntime.close(); }
    assert.equal(outcomes.filter((value) => value.allowed).length, 10);
    assert.ok(outcomes.every((value) => value.retryAfterSeconds >= 1 && value.retryAfterSeconds <= 3600));
    const counts = await sql.execute<{ attempt_count: number }[]>("select attempt_count from rate_limit_buckets where key_digest = ?", ["d".repeat(64)]);
    assert.equal(counts[0].attempt_count, 11);
    for (let attempt = 0; attempt < 4; attempt++) await limits.consume([{ keyDigest: "e".repeat(64), limit: 3 }]);
    assert.equal((await limits.consume([{ keyDigest: "e".repeat(64), limit: 3 }, { keyDigest: "f".repeat(64), limit: 20 }])).allowed, false);
    assert.equal((await sql.execute<{ attempt_count: number }[]>("select attempt_count from rate_limit_buckets where key_digest = ?", ["f".repeat(64)]))[0].attempt_count, 1);
    await testRegistrationEmail(runtime);
    await sql.execute("delete from action_tokens");
    await sql.execute("delete from credentials");
    await sql.execute("delete from user_roles");
    await sql.execute("delete from users");
    await assert.rejects(orm.migrator.down(), /Refusing destructive auth rollback/);
    await sql.execute("delete from rate_limit_buckets");
    await orm.migrator.down();
    await orm.migrator.up();
    // Exercise the same root aliases/config discovery operators use.
    const execute = promisify(execFile);
    for (const command of ["db:migrate:down", "db:migrate"]) {
      await execute("npm", ["run", command], {
        env: { ...process.env, DATABASE_URL: clientUrl }, timeout: 30_000,
      });
    }
    console.log("Database passed: migrations, guarded rollback, constraints, request isolation and transaction rollback.");
  } finally { await runtime.close(); }
}
