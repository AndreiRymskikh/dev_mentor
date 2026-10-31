import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import path from "node:path";
import { Client } from "pg";
import type { IntegrationContext } from "../context";

export async function testAuthActions({ baseUrl, artifacts, browser }: IntegrationContext, databaseUrl: string, messages: string[], internalBaseUrl: string) {
  const client = new Client({ connectionString: databaseUrl });
  const email = "browser-actions@example.test";
  const password = "browser actions password";
  const nextPassword = "new browser actions password";
  const fill = (name: string, value: string) => browser("fill", `[name="${name}"]`, value);
  const click = (name: string) => browser("find", "role", "button", "click", "--name", name, "--exact");
  const wait = (text: string) => browser("wait", "--text", text);
  const tokenFromMail = (kind: string) => { const token = new RegExp(`${kind}#token=([A-Za-z0-9_-]{43})`).exec(messages.at(-1)!)?.[1]; assert.ok(token, "Expected action token in fixture email"); return token; };
  const actionState = async (token: string) => (await client.query("select consumed_at from action_tokens where digest=$1", [createHash("sha256").update(token).digest("hex")])).rows[0];
  const openToken = async (pathname: string, token: string) => {
    await browser("open", `${baseUrl}${pathname}?discard=yes#token=${token}`);
    await browser("wait", "--fn", `location.pathname === '${pathname}' && location.search === '' && location.hash === ''`);
    await browser("wait", "--fn", `!document.documentElement.outerHTML.includes(${JSON.stringify(token)}) && !JSON.stringify(history.state).includes(${JSON.stringify(token)})`);
    await browser("wait", "--fn", `document.querySelector('meta[name="referrer"]').content === 'no-referrer' && document.querySelector('meta[name="robots"]').content.includes('noindex')`);
    await browser("wait", "--fn", `performance.getEntriesByType('resource').every(resource => new URL(resource.name).origin === location.origin)`);
    // The only token-bearing request is an explicit POST, never DOM/storage/history.
    await browser("wait", "--fn", `!document.querySelector('input[name="token"]') && sessionStorage.length === 0 && localStorage.length === 0`);
  };
  const screenshots = async (name: string) => {
    await browser("set", "viewport", "1440", "1000");
    await browser("wait", "--fn", "document.documentElement.scrollWidth <= innerWidth");
    await browser("screenshot", path.join(artifacts, `${name}-desktop.png`));
    await browser("set", "viewport", "320", "900");
    await browser("wait", "--fn", "document.documentElement.scrollWidth <= innerWidth");
    await browser("screenshot", path.join(artifacts, `${name}-mobile.png`));
    await browser("set", "viewport", "1440", "1000");
  };
  try {
    await client.connect(); await client.query("delete from rate_limit_buckets");
    for (const pathname of ["/verify-email", "/reset-password", "/account"]) {
      const document = await fetch(`${internalBaseUrl}${pathname}`, { redirect: "manual" });
      assert.match(document.headers.get("cache-control") ?? "", /no-store/);
      if (pathname === "/account") { assert.equal(document.status, 307); assert.equal(document.headers.get("location"), "/login"); }
      else { assert.equal(document.status, 200); assert.match(await document.text(), /name="referrer" content="no-referrer"/); }
    }
    await browser("cookies", "clear");
    await browser("open", `${baseUrl}/account`); await browser("wait", "--url", "**/login");
    await browser("open", `${baseUrl}/register`); await fill("displayName", "Action Browser"); await fill("email", email); await fill("password", password); await click("Create account"); await wait("If this address can be registered");
    const verification = tokenFromMail("verify-email");
    const user = (await client.query("select id from users where normalized_email=$1", [email])).rows[0];
    await openToken("/verify-email", verification);
    assert.equal((await actionState(verification)).consumed_at, null);
    assert.equal((await client.query("select email_verified_at from users where id=$1", [user.id])).rows[0].email_verified_at, null);
    await screenshots("auth-verify-email");
    await click("Verify email"); await wait("Email verified. Sign in to continue.");
    await screenshots("e01-04-verified");
    assert.ok((await actionState(verification)).consumed_at);
    assert.equal((await client.query("select count(*)::int as count from auth_sessions where user_id=$1", [user.id])).rows[0].count, 0);
    await openToken("/verify-email", verification); await click("Verify email"); await wait("The link may be invalid, expired or already used.");
    await browser("reload"); await wait("Open the link from your email");
    await fill("email", "unknown-browser-actions@example.test"); const beforeResend = messages.length; await click("Send verification email"); await wait("If this address has an eligible account"); assert.equal(messages.length, beforeResend);
    // Current role rows are loaded by the account's server-side service.
    await client.query("insert into user_roles(user_id,role) values($1,'mentor')", [user.id]);
    await browser("open", `${baseUrl}/login`); await fill("email", email); await fill("password", password); await click("Sign in"); await browser("wait", "--url", "**/account"); await wait("Your account"); await wait("Action Browser"); await wait("Mentee"); await wait("Mentor"); await screenshots("auth-account");
    await browser("open", `${baseUrl}/forgot-password`); await fill("email", email); await click("Send reset email"); await wait("If this address has an eligible account");
    const reset = tokenFromMail("reset-password");
    await openToken("/reset-password", reset); assert.equal((await actionState(reset)).consumed_at, null);
    const sessionBefore = (await client.query("select count(*)::int as count from auth_sessions where user_id=$1", [user.id])).rows[0].count;
    await screenshots("auth-reset-password"); await fill("newPassword", nextPassword); await click("Change password"); await wait("Password changed.");
    assert.equal((await client.query("select count(*)::int as count from auth_sessions where user_id=$1", [user.id])).rows[0].count, sessionBefore);
    assert.equal((await client.query("select count(*)::int as count from auth_sessions where user_id=$1 and revoked_at is null", [user.id])).rows[0].count, 0);
    // Existing browser cookie must fail immediately; reset did not create a new one.
    await browser("open", `${baseUrl}/account`); await browser("wait", "--url", "**/login");
    await openToken("/reset-password", reset); await fill("newPassword", nextPassword); await click("Change password"); await wait("The link may be invalid, expired or already used.");
    await browser("reload"); await wait("Open the link from your email");
    await browser("open", `${baseUrl}/login`); await fill("email", email); await fill("password", password); await click("Sign in"); await wait("Unable to sign in. Check your email and password");
    await fill("password", nextPassword); await click("Sign in"); await browser("wait", "--url", "**/account"); await wait("Your account"); await click("Sign out"); await browser("wait", "--url", "**/login");
    assert.equal((await client.query("select count(*)::int as count from auth_sessions where user_id=$1 and revoked_at is null", [user.id])).rows[0].count, 0);
    await browser("open", `${baseUrl}/account`); await browser("wait", "--url", "**/login");
    console.log("Auth action browser tests passed: fragment privacy, explicit verification/reset, replay, account roles and reset/logout session revocation.");
  } finally { await client.end(); }
}
