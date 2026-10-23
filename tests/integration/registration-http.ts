import { testAdminUsers } from "./admin-users";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash, createHmac, randomBytes } from "node:crypto";
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
      tls: { key: await readFile(keyPath), cert: await readFile(certificatePath) },
      messages,
      environment: { NODE_EXTRA_CA_CERTS: certificatePath, APP_ORIGIN: "https://fixture.example.test", EMAIL_FROM: "fixture@example.test", SMTP_HOST: "127.0.0.1", SMTP_PORT: String(address.port), SMTP_USER: "fixture", SMTP_PASSWORD: password, SMTP_LOCAL_SINK: "false", JWT_SECRET: randomBytes(32).toString("hex"), RATE_LIMIT_SECRET: randomBytes(32).toString("hex") },
      async test(baseUrl: string, databaseUrl: string) {
        const client = new Client({ connectionString: databaseUrl });
        const input = { email: "http-registration@example.test", displayName: "HTTP Registration", password: "http fixture password" };
        const post = (body: unknown, extra: Record<string, string> = {}) => fetch(`${baseUrl}/api/auth/register`, { method: "POST", headers: { "content-type": "application/json", "X-DevMentor-CSRF": "1", origin: this.environment.APP_ORIGIN, ...extra }, body: JSON.stringify(body), signal: AbortSignal.timeout(config.authRequestTimeoutMs) });
        try {
          await client.connect();
          assert.equal((await post(input, { "X-DevMentor-CSRF": "0" })).status, 403);
          assert.equal((await post(input, { origin: "https://attacker.test" })).status, 403);
          const invalid = await post({ ...input, password: "short" });
          assert.equal(invalid.status, 400); assert.ok((await invalid.json()).error.fieldErrors.password);
          assert.equal((await post({ ...input, roles: ["administrator"] })).status, 400);
          const authPost = (operation: string, body: unknown, extra: Record<string,string> = {}) => fetch(`${baseUrl}/api/auth/${operation}`, { method: "POST", headers: { "content-type":"application/json", "X-DevMentor-CSRF":"1", origin:this.environment.APP_ORIGIN, ...extra }, body:JSON.stringify(body), signal:AbortSignal.timeout(config.authRequestTimeoutMs) });
          const accepted = await post(input);
          assert.equal(accepted.status, 202); assert.equal(accepted.headers.get("cache-control"), "no-store"); assert.equal(accepted.headers.get("set-cookie"), null);
          const generic = await accepted.json();
          assert.equal((await authPost("login", { email:input.email,password:input.password })).status,401);
          assert.equal(messages.length, 1);
          const token = /verify-email#token=([A-Za-z0-9_-]{43})/.exec(messages[0])?.[1];
          assert.ok(messages[0].includes(`${this.environment.APP_ORIGIN}/verify-email#token=`));
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
          const verificationPost = (operation: string, body: unknown, extra: Record<string, string> = {}) => fetch(`${baseUrl}/api/auth/verification/${operation}`, { method: "POST", headers: { "content-type": "application/json", "X-DevMentor-CSRF": "1", origin: this.environment.APP_ORIGIN, ...extra }, body: JSON.stringify(body), signal: AbortSignal.timeout(config.authRequestTimeoutMs) });
          const requestVerification = async (email: string) => {
            const started = Date.now(); const response = await verificationPost("request", { email });
            assert.equal(response.status, 202); assert.equal(response.headers.get("cache-control"), "no-store"); assert.equal(response.headers.get("set-cookie"), null);
            assert.ok(Date.now() - started >= config.authResponseWindowMinimumMs); return response.json();
          };
          assert.equal((await verificationPost("request", { email: input.email }, { "X-DevMentor-CSRF": "0" })).status, 403);
          assert.equal((await verificationPost("confirm", { token }, { origin: "https://attacker.test" })).status, 403);
          assert.equal((await verificationPost("request", { email: "invalid", role: "administrator" })).status, 400);
          const beforeFailure = messages.length;
          const resendGeneric = await requestVerification(failedEmail);
          assert.equal(messages.length, beforeFailure);
          const failedTokens = await client.query("select t.consumed_at from action_tokens t join users u on u.id=t.user_id where u.normalized_email=$1", [failedEmail]);
          assert.equal(failedTokens.rows.length, 2); assert.ok(failedTokens.rows.every((row) => row.consumed_at));
          rejectDelivery = false;
          const beforeRetry = messages.length;
          assert.deepEqual(await requestVerification(failedEmail), resendGeneric);
          assert.equal(messages.length, beforeRetry + 1);
          const recoveredToken = /verify-email#token=([A-Za-z0-9_-]{43})/.exec(messages.at(-1)!)?.[1]; assert.ok(recoveredToken);
          const recover = await verificationPost("confirm", { token: recoveredToken }); assert.equal(recover.status, 200); assert.equal(recover.headers.get("cache-control"), "no-store");
          assert.equal((await verificationPost("confirm", { token: recoveredToken })).status, 400);
          const beforeReplacement = messages.length;
          assert.deepEqual(await requestVerification(input.email), resendGeneric); assert.equal(messages.length, beforeReplacement + 1);
          const resentToken = /verify-email#token=([A-Za-z0-9_-]{43})/.exec(messages.at(-1)!)?.[1]; assert.ok(resentToken);
          assert.equal((await verificationPost("confirm", { token })).status, 400);
          assert.equal((await fetch(`${baseUrl}/api/auth/verification/confirm?token=${resentToken}`)).status, 405);
          const confirmed = await Promise.all([verificationPost("confirm", { token: resentToken }), verificationPost("confirm", { token: resentToken })]);
          assert.deepEqual(confirmed.map((response) => response.status).sort(), [200, 400]);
          const verified = await client.query("select email_verified_at from users where normalized_email=$1", [input.email]); assert.ok(verified.rows[0].email_verified_at);
          const loggedIn = await authPost("login", { email:input.email,password:input.password }); assert.equal(loggedIn.status,200);
          const cookie = loggedIn.headers.get("set-cookie")!; assert.match(cookie,/^__Host-devmentor-session=/); assert.match(cookie,/HttpOnly/); assert.match(cookie,/SameSite=Lax/); assert.match(cookie,/Secure/); assert.ok(!cookie.includes("Domain="));
          const principal = (await loggedIn.json()).data; assert.deepEqual(Object.keys(principal).sort(),["displayName","id","roles"]); assert.deepEqual(principal.roles,["developer"]);
          const cookieHeader = cookie.split(";")[0]; const getSession = (value = cookieHeader) => fetch(`${baseUrl}/api/auth/session`,{headers:{cookie:value}, signal:AbortSignal.timeout(config.authRequestTimeoutMs)});
          assert.deepEqual((await (await getSession()).json()).data,principal);
          const enrollMentor = (body:unknown,extra:Record<string,string>={}) => fetch(`${baseUrl}/api/users/me/mentor`,{method:"POST",headers:{"content-type":"application/json","X-DevMentor-CSRF":"1",origin:this.environment.APP_ORIGIN,cookie:cookieHeader,...extra},body:JSON.stringify(body),signal:AbortSignal.timeout(config.authRequestTimeoutMs)});
          assert.equal((await enrollMentor({},{cookie:"", "X-User-Id":principal.id,"X-Role":"administrator"})).status,401);
          assert.equal((await enrollMentor({},{"X-DevMentor-CSRF":"0"})).status,403);
          assert.equal((await enrollMentor({userId:principal.id,role:"administrator"})).status,400);
          for(let attempt=0;attempt<2;attempt++){const enrolled=await enrollMentor({});assert.equal(enrolled.status,200);assert.equal(enrolled.headers.get("cache-control"),"no-store");assert.equal(enrolled.headers.get("set-cookie"),null);assert.deepEqual((await enrolled.json()).data.roles.sort(),["developer","mentor"]);}
          assert.deepEqual((await (await getSession()).json()).data.roles.sort(),["developer","mentor"]);
          assert.equal((await getSession(cookieHeader.slice(0,-8)+"aaaaaaaa")).status,401);
          assert.equal((await fetch(`${baseUrl}/api/auth/session`,{headers:{"X-User-Id":principal.id,"X-Role":"administrator"}})).status,401);
          for(let i=0;i<2;i++){const out=await authPost("logout",{}, {cookie:cookieHeader});assert.equal(out.status,200,"strict empty JSON logout succeeds and is idempotent");assert.match(out.headers.get("set-cookie")!,/Max-Age=0/);assert.match(out.headers.get("set-cookie")!,/Secure/);}
          assert.equal((await getSession()).status,401);
          const bodylessLogout=await fetch(`${baseUrl}/api/auth/logout`,{method:"POST",headers:{"X-DevMentor-CSRF":"1",origin:this.environment.APP_ORIGIN},signal:AbortSignal.timeout(config.authRequestTimeoutMs)});assert.equal(bodylessLogout.status,200,"production Next bodyless logout succeeds with no content type");
          assert.equal((await authPost("logout",{userId:principal.id})).status,400,"logout rejects caller-supplied user identity");
          // Seed five prior attempts for this owned fixture's pair in both adjacent
          // windows: earlier slow email scenarios can span a fixed15-minute boundary.
          const loginPairDigest=createHmac("sha256",this.environment.RATE_LIMIT_SECRET).update(JSON.stringify(["login:pair",JSON.stringify([input.email,"shared-untrusted-peer"])])).digest("hex");
          await client.query("insert into rate_limit_buckets(key_digest,window_start,attempt_count,expires_at) select $1,to_timestamp((floor(extract(epoch from statement_timestamp())/900)+n)*900),5,to_timestamp((floor(extract(epoch from statement_timestamp())/900)+n+1)*900) from generate_series(0,1) n on conflict(key_digest,window_start) do update set attempt_count=5",[loginPairDigest]);
          const limitedLogin=await authPost("login",{email:input.email,password:input.password},{"x-forwarded-for":"198.51.100.1"});assert.equal(limitedLogin.status,429,"sixth pair attempt is denied even with spoofed forwarded IP");assert.ok(Number(limitedLogin.headers.get("retry-after"))<=900);
          const beforeUnknown = messages.length;
          assert.deepEqual(await requestVerification("http-unknown@example.test"), resendGeneric); assert.equal(messages.length, beforeUnknown);
          // Distinct fixtures prove generic already-verified and credentialless requests without spending a fourth address allowance.
          await client.query("insert into users (id,normalized_email,display_name,email_verified_at,created_at,updated_at) values (gen_random_uuid(),$1,$2,now(),now(),now()),(gen_random_uuid(),$3,$2,null,now(),now())", ["http-verified@example.test", "HTTP fixture", "http-credentialless@example.test"]);
          assert.deepEqual(await requestVerification("http-verified@example.test"), resendGeneric);
          assert.deepEqual(await requestVerification("http-credentialless@example.test"), resendGeneric);
          assert.equal(messages.length, beforeUnknown);
          assert.equal((await client.query("select t.id from action_tokens t join users u on u.id=t.user_id where u.normalized_email=any($1)", [["http-unknown@example.test", "http-verified@example.test", "http-credentialless@example.test"]])).rowCount, 0);
          for (const purpose of ["verify-email", "reset-password"]) {
            const invalidToken = randomBytes(32).toString("base64url");
            await client.query("insert into action_tokens (id,user_id,purpose,digest,expires_at) select gen_random_uuid(),id,$1,$2,$3 from users where normalized_email=$4", [purpose, createHash("sha256").update(invalidToken).digest("hex"), purpose === "verify-email" ? new Date(Date.now() - 1000) : new Date(Date.now() + 86400000), failedEmail]);
            assert.equal((await verificationPost("confirm", { token: invalidToken })).status, 400);
          }
          console.log("Verification HTTP passed: same-account failed-email resend recovery, replacement, generic outcomes, CSRF POST-only, single-use replay, expiry and purpose.");
          const remaining = await Promise.all(Array.from({ length: 7 }, (_, index) => post({ ...input, email: `http-${index}@example.test` }, { "x-forwarded-for": `10.0.0.${index}` })));
          assert.ok(remaining.every((response) => response.status === 202));
          const limited = await post({ ...input, email: "over-limit@example.test" }, { "x-forwarded-for": "9.8.7.6", "x-real-ip": "8.8.8.8" });
          assert.equal(limited.status, 429); assert.ok(Number(limited.headers.get("retry-after")) >= 1); assert.ok(Number(limited.headers.get("retry-after")) <= 3600);
          assert.equal(limited.headers.get("cache-control"), "no-store");
          console.log("Registration HTTP passed: secure SMTP, generic202, strict fields, CSRF, real bcrypt/digest/developer persistence, no session, delivery invalidation and spoof-resistant shared429.");
          // This client is connected only to the runner-owned disposable database.
          // Independent recovery scenarios get fresh quotas after earlier quota assertions.
          await client.query("delete from rate_limit_buckets");
          const recoveryPost = (operation: string, body: unknown, extra: Record<string, string> = {}) => authPost(`password/${operation}`, body, extra);
          const requestRecovery = async (email: string) => {
            const started = Date.now();
            const response = await recoveryPost("forgot", { email });
            assert.equal(response.status, 202);
            assert.equal(response.headers.get("cache-control"), "no-store");
            assert.equal(response.headers.get("set-cookie"), null);
            assert.ok(Date.now() - started >= config.authResponseWindowMinimumMs);
            return response.json();
          };
          assert.equal((await recoveryPost("forgot", { email: input.email }, { "X-DevMentor-CSRF": "0" })).status, 403);
          assert.equal((await recoveryPost("reset", { token: resentToken, newPassword: "replacement password" }, { origin: "https://attacker.test" })).status, 403);
          assert.equal((await recoveryPost("forgot", { email: input.email, role: "administrator" })).status, 400);
          assert.equal((await recoveryPost("reset", { token: resentToken, newPassword: "replacement password", userId: principal.id })).status, 400);
          assert.equal((await recoveryPost("reset", { token: resentToken, newPassword: "short" })).status, 400);
          assert.equal((await recoveryPost("reset", { token: resentToken, newPassword: "replacement password" })).status, 400, "verification tokens cannot reset passwords");
          assert.equal((await fetch(`${baseUrl}/api/auth/password/reset?token=${resentToken}`)).status, 405);
          const beforeRecovery = messages.length;
          rejectDelivery = true;
          const [unknownRecovery, credentiallessRecovery, failedRecovery] = await Promise.all([
            requestRecovery("http-recovery-unknown@example.test"),
            requestRecovery("http-credentialless@example.test"),
            requestRecovery(input.email),
          ]);
          assert.deepEqual(unknownRecovery, failedRecovery);
          assert.deepEqual(credentiallessRecovery, failedRecovery);
          assert.equal(messages.length, beforeRecovery);
          const failedReset = await client.query("select t.consumed_at from action_tokens t join users u on u.id=t.user_id where u.normalized_email=$1 and t.purpose='reset-password'", [input.email]);
          assert.equal(failedReset.rowCount, 1);
          assert.ok(failedReset.rows[0].consumed_at);
          assert.equal((await client.query("select t.id from action_tokens t join users u on u.id=t.user_id where u.normalized_email=any($1) and t.purpose='reset-password'", [["http-recovery-unknown@example.test", "http-credentialless@example.test"]])).rowCount, 0);
          rejectDelivery = false;
          assert.deepEqual(await requestRecovery(input.email), failedRecovery);
          assert.equal(messages.length, beforeRecovery + 1);
          const resetToken = /reset-password#token=([A-Za-z0-9_-]{43})/.exec(messages.at(-1)!)?.[1];
          assert.ok(messages.at(-1)!.includes(`${this.environment.APP_ORIGIN}/reset-password#token=`));
          assert.ok(resetToken, "fixed-origin fragment reset link delivered over authenticated STARTTLS");
          const resetRows = await client.query("select t.digest,t.expires_at from action_tokens t join users u on u.id=t.user_id where u.normalized_email=$1 and t.purpose='reset-password' and t.consumed_at is null", [input.email]);
          assert.equal(resetRows.rowCount, 1);
          assert.equal(resetRows.rows[0].digest, createHash("sha256").update(resetToken).digest("hex"));
          assert.ok(resetRows.rows[0].expires_at.getTime() - Date.now() <= 1800000);
          assert.ok(resetRows.rows[0].expires_at.getTime() - Date.now() > 1700000);
          const oldLogin = await authPost("login", { email: input.email, password: input.password });
          assert.equal(oldLogin.status, 200);
          const oldCookie = oldLogin.headers.get("set-cookie")!.split(";")[0];
          const sessionCount = (await client.query("select count(*)::int as count from auth_sessions where user_id=$1", [principal.id])).rows[0].count;
          const resetResponse = await recoveryPost("reset", { token: resetToken, newPassword: "replacement password" });
          assert.equal(resetResponse.status, 200);
          assert.equal(resetResponse.headers.get("set-cookie"), null);
          assert.equal(resetResponse.headers.get("cache-control"), "no-store");
          assert.equal((await client.query("select count(*)::int as count from auth_sessions where user_id=$1", [principal.id])).rows[0].count, sessionCount, "reset must not log in");
          assert.equal((await getSession(oldCookie)).status, 401);
          assert.equal((await authPost("login", { email: input.email, password: input.password })).status, 401);
          assert.equal((await authPost("login", { email: input.email, password: "replacement password" })).status, 200);
          assert.equal((await recoveryPost("reset", { token: resetToken, newPassword: "different replacement" })).status, 400);
          const expiredReset = randomBytes(32).toString("base64url");
          await client.query("insert into action_tokens (id,user_id,purpose,digest,expires_at) values(gen_random_uuid(),$1,'reset-password',$2,$3)", [principal.id, createHash("sha256").update(expiredReset).digest("hex"), new Date(Date.now() - 1000)]);
          assert.equal((await recoveryPost("reset", { token: expiredReset, newPassword: "replacement password" })).status, 400);
          await testAdminUsers(baseUrl, databaseUrl, this.environment.JWT_SECRET, this.environment.APP_ORIGIN);
          console.log("Recovery HTTP passed: generic timed unknown/credentialless/SMTP failure, same-account retry, TLS fragment/digest/TTL, strict CSRF fields, credential replacement, old-password/session denial, no auto-login, replay and expiry/purpose.");

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
