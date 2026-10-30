import assert from "node:assert/strict";
import path from "node:path";
import { Client } from "pg";
import type { IntegrationContext } from "../context";

export async function testAuthForms({ baseUrl, artifacts, browser }: IntegrationContext, databaseUrl: string, messages: string[]) {
  const client = new Client({ connectionString: databaseUrl });
  const email = "browser-auth@example.test";
  const password = "browser fixture password";
  const waitText = (text: string) => browser("wait", "--text", text);
  const fill = (name: string, value: string) => browser("fill", `[name="${name}"]`, value);
  const click = (name: string) => browser("find", "role", "button", "click", "--name", name, "--exact");
  try {
    await client.connect();
    // Independent browser forms use the same runner-owned database with fresh quotas.
    await client.query("delete from rate_limit_buckets");
    await browser("set", "viewport", "1440", "1000");
    await browser("set", "media", "light");
    await browser("open", `${baseUrl}/login`);
    for (const width of [320, 390, 768, 1440]) {
      await browser("set", "viewport", String(width), "1000");
      await browser("wait", "--fn", "document.documentElement.scrollWidth <= innerWidth && document.querySelector('[name=password]').autocomplete === 'current-password'");
      await browser("screenshot", path.join(artifacts, `e01-01-sign-in-${width}.png`));
    }
    await browser("open", `${baseUrl}/register`);
    await browser("wait", "--fn", `(() => {
      const main = document.querySelector('.dm-auth-card');
      const form = document.querySelector('fieldset');
      if (!main || !form) return false;
      return main.getBoundingClientRect().width <= 520 && getComputedStyle(form).display === 'grid' && parseFloat(getComputedStyle(form).rowGap) >= 16;
    })()`);
    await browser("press", "Tab");
    await browser("wait", "--fn", `(() => { const active = document.activeElement; return active.matches(':focus-visible') && getComputedStyle(active).outlineStyle === 'solid' && parseFloat(getComputedStyle(active).outlineWidth) >= 2; })()`);
    await browser("screenshot", path.join(artifacts, "auth-register-desktop.png"));
    await browser("set", "viewport", "320", "900");
    await browser("wait", "--fn", `document.documentElement.scrollWidth <= window.innerWidth`);
    await browser("screenshot", path.join(artifacts, "auth-register-mobile.png"));
    await browser("set", "viewport", "1440", "1000");
    await click("Create account");
    await waitText("Please correct the highlighted fields.");
    await fill("displayName", "Browser Account"); await fill("email", email); await fill("password", password);
    const before = messages.length;
    await click("Continue with GitHub"); await waitText("GitHub sign-in will be implemented soon.");
    assert.equal(messages.length, before);
    await click("Create account");
    await waitText("Check your inbox");
    await waitText("Verify your email using the link, then sign in.");
    const acceptedVisible = `(() => {
      const heading = document.querySelector('h1');
      const next = document.querySelector('nav[aria-label="Registration next steps"]');
      if (!heading || !next || document.querySelector('form') || document.querySelector('input[type="password"]')) return false;
      const links = [...next.querySelectorAll('a')];
      return document.activeElement === heading && heading.textContent === 'Check your inbox' && links.length === 3 && links.every(link => {
        const box = link.getBoundingClientRect();
        return box.top >= 0 && box.bottom <= window.innerHeight && box.left >= 0 && box.right <= window.innerWidth;
      }) && next.querySelector('a[href="/login"]')?.textContent === 'Sign in' && next.querySelector('a[href="/verify-email"]')?.textContent === 'Request another verification email' && document.querySelectorAll('[role="status"]').length === 1;
    })()`;
    await browser("wait", "--fn", acceptedVisible);
    await browser("screenshot", path.join(artifacts, "auth-register-accepted-desktop.png"));
    await browser("set", "viewport", "320", "900");
    await browser("wait", "--fn", acceptedVisible);
    await browser("wait", "--fn", "document.documentElement.scrollWidth <= window.innerWidth");
    await browser("screenshot", path.join(artifacts, "auth-register-accepted-mobile.png"));
    await browser("set", "viewport", "1440", "1000");
    assert.equal(messages.length, before + 1);
    const registered = await client.query("select u.id,u.email_verified_at,r.role from users u join user_roles r on r.user_id=u.id where u.normalized_email=$1", [email]);
    assert.equal(registered.rowCount, 1); assert.equal(registered.rows[0].email_verified_at, null); assert.equal(registered.rows[0].role, "developer");
    await browser("scroll", "up", "2000");
    await browser("screenshot", path.join(artifacts, "auth-register.png"));
    await browser("open", `${baseUrl}/login`); await fill("email", email); await fill("password", password); await click("Sign in");
    await waitText("Unable to sign in. Check your email and password");
    // P4.1 proves actual login through an independently verified disposable fixture;
    // fragment-page verification belongs to P4.2 rather than a fabricated browser API call.
    await client.query("update users set email_verified_at=now() where id=$1", [registered.rows[0].id]);
    await click("Sign in");
    await browser("wait", "--url", "**/account");
    assert.equal((await client.query("select count(*)::int as count from auth_sessions where user_id=$1 and revoked_at is null", [registered.rows[0].id])).rows[0].count, 1);
    await browser("open", `${baseUrl}/api/auth/session`);
    assert.match((await browser("snapshot")).data?.snapshot ?? "", /Browser Account/);
    await browser("open", `${baseUrl}/forgot-password`); await fill("email", email); const beforeRecovery = messages.length; await click("Send reset email");
    await waitText("If this address has an eligible account");
    assert.equal(messages.length, beforeRecovery + 1); assert.match(messages.at(-1)!, /reset-password#token=/);
    await browser("screenshot", path.join(artifacts, "auth-forgot-password.png"));
    await browser("open", `${baseUrl}/login`); await fill("email", email); await fill("password", "wrong password");
    for (let i = 0; i < 3; i++) { await click("Sign in"); await waitText("Unable to sign in. Check your email and password"); }
    await click("Sign in"); await waitText("Too many requests");
    await browser("screenshot", path.join(artifacts, "auth-login-rate-limit.png"));
    console.log("Auth browser forms passed: native HTTPS CSRF, generic registration/recovery, real SMTP/database/session, unverified denial, GitHub feedback and login rate error.");
  } finally { await client.end(); }
}
