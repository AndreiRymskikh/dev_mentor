import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { SMTPServer } from "smtp-server";
import { ActionToken, User, RegistrationRepository, RateLimitRepository, type createDatabaseRuntime } from "../../packages/db/src";
import { RegistrationService } from "../../packages/core/src/services/users/registration.service";
import { RateLimitService } from "../../packages/core/src/services/limits/rate-limit.service";
import { SmtpEmailSender } from "../../packages/core/src/services/emails/adapters/smtp-email-sender";

/** All recipients are accepted only by this runner-owned loopback SMTP sink. */
export async function testRegistrationEmail(runtime: ReturnType<typeof createDatabaseRuntime>) {
  const messages: string[] = [];
  const logs: string[] = [];
  let rejectDelivery = false;
  let stall = false;
  const server = new SMTPServer({
    secure: false, disabledCommands: ["AUTH", "STARTTLS"], logger: false, closeTimeout: 1000,
    onData(stream, _session, callback) {
      let body = "";
      stream.on("data", (chunk: Buffer) => { body += chunk.toString("utf8"); });
      stream.on("end", () => {
        if (stall) return;
        if (rejectDelivery) callback(new Error("Disposable sink rejected delivery"));
        else { messages.push(body); callback(); }
      });
    },
  });
  await new Promise<void>((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  const address = server.server.address();
  assert.ok(address && typeof address !== "string");
  const sender = new SmtpEmailSender(() => ({ NODE_ENV: "test", SMTP_LOCAL_SINK: "true", SMTP_HOST: "127.0.0.1", SMTP_PORT: String(address.port), APP_ORIGIN: "http://localhost:3000", EMAIL_FROM: "sink@example.test" }));
  const repository = new RegistrationRepository(runtime);
  const service = new RegistrationService(repository, new RateLimitService(new RateLimitRepository(runtime), () => "test-only-secret".repeat(3)), sender, { warn: (event) => { logs.push(event); } });
  const input = { email: "delivery@example.test", displayName: "Delivery", password: "test password only" };
  try {
    const result = await service.register(input, "delivery-test");
    assert.equal(messages.length, 1);
    const token = /http:\/\/localhost:3000\/verify-email#token=([A-Za-z0-9_-]{43})/.exec(messages[0])?.[1];
    assert.ok(token);
    const digest = createHash("sha256").update(token).digest("hex");
    const userId = await runtime.withEntityManager(async (em) => {
      const user = await em.findOneOrFail(User, { normalizedEmail: input.email });
      const record = await em.findOneOrFail(ActionToken, { userId: user.id, digest });
      assert.equal(record.consumedAt, null);
      assert.ok(record.expiresAt.getTime() > Date.now() + 23 * 3600000);
      return user.id;
    });
    assert.deepEqual(await service.register(input, "delivery-test"), result);
    assert.equal(messages.length, 1);
    rejectDelivery = true;
    assert.deepEqual(await service.register({ ...input, email: "failure@example.test" }, "failure-test"), result);
    await runtime.withEntityManager(async (em) => {
      const user = await em.findOneOrFail(User, { normalizedEmail: "failure@example.test" });
      assert.ok((await em.findOneOrFail(ActionToken, { userId: user.id })).consumedAt);
    });
    rejectDelivery = false;
    assert.deepEqual(await service.register({ ...input, email: "retry@example.test" }, "retry-test"), result);
    assert.equal(messages.length, 2);
    // A delayed delivery failure for an older token cannot invalidate a replacement.
    const replacementDigest = "9".repeat(64);
    await runtime.transaction(async (em) => {
      await em.nativeUpdate(ActionToken, { userId, digest }, { consumedAt: new Date() });
      em.create(ActionToken, { id: randomUUID(), userId, purpose: "verify-email", digest: replacementDigest, expiresAt: new Date(Date.now() + 86400000) });
    });
    await repository.invalidateVerification(userId, digest);
    await runtime.withEntityManager(async (em) => assert.equal((await em.findOneOrFail(ActionToken, { digest: replacementDigest })).consumedAt, null));
    stall = true;
    const started = Date.now();
    await assert.rejects(sender.send({ type: "verification", to: "stall@example.test", token: "s".repeat(43) }), /Service temporarily unavailable/);
    assert.ok(Date.now() - started < 12000, "overall SMTP deadline must bound DATA completion");
    assert.deepEqual(logs, ["emails.verification.delivery_failed"]);
    console.log("Registration email passed: real SMTP delivery, persisted digest, collision, failure invalidation, recovery and stalled delivery cancellation.");
  } finally {
    await new Promise<void>((resolve) => server.close(resolve));
  }
}
