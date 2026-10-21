import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { SMTPServer } from "smtp-server";
import { compare } from "bcryptjs";
import { Client } from "pg";
import { integrationConfig as config } from "./config";

/** Authenticated STARTTLS fixture: trust applies only to the owned production child. */
export async function registrationFixture() {
  const directory = await mkdtemp(path.join(tmpdir(), "devmentor-smtp-"));
  const keyPath = path.join(directory, "key.pem");
  const certificatePath = path.join(directory, "cert.pem");
  const password = randomBytes(32).toString("hex");
  let rejectDelivery = false;
  const messages: string[] = [];
  let server: SMTPServer | undefined;
  try {
    await promisify(execFile)("openssl", ["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-days", "1", "-subj", "/CN=127.0.0.1", "-addext", "subjectAltName=IP:127.0.0.1", "-keyout", keyPath, "-out", certificatePath], { timeout: config.certificateTimeoutMs });
    server = new SMTPServer({
      secure: false, key: await readFile(keyPath), cert: await readFile(certificatePath), logger: false, closeTimeout: config.smtpCloseTimeoutMs,
      authOptional: false,
      onAuth(auth, session, callback) {
        assert.equal(session.secure, true);
        if (auth.username === "fixture" && auth.password === password) callback(null, { user: "fixture" });
        else callback(new Error("Invalid fixture credentials"));
      },
      onData(stream, session, callback) {
        assert.equal(session.secure, true);
        let body = "";
        stream.on("data", (chunk: Buffer) => { body += chunk.toString(); });
        stream.on("end", () => { if (rejectDelivery) callback(new Error("Fixture rejection")); else { messages.push(body); callback(); } });
      },
    });
    await new Promise<void>((resolve, reject) => { server!.once("error", reject); server!.listen(0, "127.0.0.1", resolve); });
    const address = server.server.address();
    assert.ok(address && typeof address !== "string");
    return {
      environment: { NODE_EXTRA_CA_CERTS: certificatePath, APP_ORIGIN: "https://fixture.example.test", EMAIL_FROM: "fixture@example.test", SMTP_HOST: "127.0.0.1", SMTP_PORT: String(address.port), SMTP_USER: "fixture", SMTP_PASSWORD: password, SMTP_LOCAL_SINK: "false", RATE_LIMIT_SECRET: randomBytes(32).toString("hex") },
      async test(baseUrl: string, databaseUrl: string) {
        const client = new Client({ connectionString: databaseUrl });
        const input = { email: "http-registration@example.test", displayName: "HTTP Registration", password: "http fixture password" };
        const post = (body: unknown, extra: Record<string, string> = {}) => fetch(`${baseUrl}/api/auth/register`, { method: "POST", headers: { "content-type": "application/json", "X-DevMentor-CSRF": "1", origin: "https://fixture.example.test", ...extra }, body: JSON.stringify(body), signal: AbortSignal.timeout(config.authRequestTimeoutMs) });
        try {
          await client.connect();
          assert.equal((await post(input, { "X-DevMentor-CSRF": "0" })).status, 403);
          assert.equal((await post(input, { origin: "https://attacker.test" })).status, 403);
          const invalid = await post({ ...input, password: "short" });
          assert.equal(invalid.status, 400); assert.ok((await invalid.json()).error.fieldErrors.password);
          assert.equal((await post({ ...input, roles: ["administrator"] })).status, 400);
          const accepted = await post(input);
          assert.equal(accepted.status, 202); assert.equal(accepted.headers.get("cache-control"), "no-store"); assert.equal(accepted.headers.get("set-cookie"), null);
          const generic = await accepted.json();
          assert.equal(messages.length, 1);
          const token = /https:\/\/fixture.example.test\/verify-email#token=([A-Za-z0-9_-]{43})/.exec(messages[0])?.[1];
          assert.ok(token, "production app delivered over authenticated STARTTLS");
          const rows = await client.query<{ password_hash: string; digest: string; role: string; email_verified_at: null }>("select c.password_hash,t.digest,r.role,u.email_verified_at from users u join credentials c on c.user_id=u.id join action_tokens t on t.user_id=u.id join user_roles r on r.user_id=u.id where u.normalized_email=$1", [input.email]);
          assert.equal(rows.rows.length, 1); const row = rows.rows[0];
          assert.equal(await compare(input.password, row.password_hash), true); assert.match(row.password_hash, /^\$2[ab]\$12\$/);
          assert.equal(row.digest, createHash("sha256").update(token).digest("hex")); assert.equal(row.role, "developer"); assert.equal(row.email_verified_at, null);
          assert.equal((await client.query("select * from auth_sessions")).rowCount, 0);
          assert.deepEqual(await (await post(input)).json(), generic); assert.equal(messages.length, 1);
          rejectDelivery = true;
          const failedEmail = "http-failed@example.test";
          assert.deepEqual(await (await post({ ...input, email: failedEmail })).json(), generic);
          const failed = await client.query("select t.consumed_at from action_tokens t join users u on u.id=t.user_id where u.normalized_email=$1", [failedEmail]);
          assert.ok(failed.rows[0].consumed_at);
          rejectDelivery = false;
          const remaining = await Promise.all(Array.from({ length: 7 }, (_, index) => post({ ...input, email: `http-${index}@example.test` }, { "x-forwarded-for": `10.0.0.${index}` })));
          assert.ok(remaining.every((response) => response.status === 202));
          const limited = await post({ ...input, email: "over-limit@example.test" }, { "x-forwarded-for": "9.8.7.6", "x-real-ip": "8.8.8.8" });
          assert.equal(limited.status, 429); assert.ok(Number(limited.headers.get("retry-after")) >= 1); assert.ok(Number(limited.headers.get("retry-after")) <= 3600);
          assert.equal(limited.headers.get("cache-control"), "no-store");
          console.log("Registration HTTP passed: secure SMTP, generic202, strict fields, CSRF, real bcrypt/digest/developer persistence, no session, delivery invalidation and spoof-resistant shared429.");
        } finally { await client.end(); }
      },
      async close() { await new Promise<void>((resolve) => server!.close(resolve)); await rm(directory, { recursive: true, force: true }); },
    };
  } catch (error) {
    if (server) await new Promise<void>((resolve) => server!.close(resolve));
    await rm(directory, { recursive: true, force: true });
    throw error;
  }
}
