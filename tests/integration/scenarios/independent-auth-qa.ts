import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { hash } from "bcryptjs";
import { Client } from "pg";
import type { IntegrationContext } from "../context";

/** Independent exploratory checks: synthetic transport states are explicitly separate
 * from real authentication, authorization, CSRF and runner-owned database assertions. */
export async function testIndependentAuthQa({ baseUrl, artifacts, browser }: IntegrationContext, databaseUrl: string, messages: string[]) {
  const client = new Client({ connectionString: databaseUrl });
  const ids = [randomUUID(), randomUUID()];
  const emails = ["independent-qa-admin@example.test", `${"long".repeat(15)}@example.test`];
  const password = "independent QA password";
  let stage = "fixture";
  const wait = (text: string) => browser("wait", "--text", text);
  const check = (expression: string) => browser("wait", "--fn", expression);
  const click = (name: string) => browser("find", "role", "button", "click", "--name", name, "--exact");
  const evaluate = (script: string) => browser("eval", script);
  const restore = () => evaluate("if(window.__qaOriginalFetch){window.fetch=window.__qaOriginalFetch;delete window.__qaOriginalFetch;} if(window.__qaRelease){window.__qaRelease();delete window.__qaRelease;} true");
  const shot = async (name: string) => {
    for (const [width, height, suffix] of [[1280, 1000, "desktop"], [320, 900, "mobile"]] as const) {
      await browser("set", "viewport", String(width), String(height));
      await check("document.documentElement.scrollWidth <= innerWidth");
      await browser("screenshot", path.join(artifacts, `qa-${name}-${suffix}.png`));
    }
    await browser("set", "viewport", "1280", "1000");
  };
  const search = async (query: string) => { await browser("fill", '[name="q"]', query); await click("Search"); };
  const settled = () => check("!document.querySelector('.users-table [role=status]') && !document.querySelector('[role=alert]') && !!document.querySelector('table')");
  const intercept = (pathname: string, mode: "failure" | "delay") => evaluate(`(() => {
    window.__qaOriginalFetch=window.fetch; window.__qaCalls=0;
    window.fetch=async function(input,options){
      const url=new URL(typeof input==='string'?input:input.url,location.origin);
      if(url.origin===location.origin && url.pathname===${JSON.stringify(pathname)}){
        window.__qaCalls++;
        ${mode === "failure" ? `return new Response(JSON.stringify({ok:false,error:{code:'SERVICE_UNAVAILABLE',message:'Service temporarily unavailable'}}),{status:503,headers:{'Content-Type':'application/json'}});` : `await new Promise(resolve=>{window.__qaRelease=resolve});`}
      }
      return window.__qaOriginalFetch.call(window,input,options);
    }; return true;
  })()`);
  try {
    await client.connect(); const passwordHash = await hash(password, 12);
    for (const [index, id] of ids.entries()) {
      await client.query("insert into users(id,normalized_email,display_name,email_verified_at,created_at,updated_at) values($1,$2,$3,now(),now(),now())", [id, emails[index], index === 0 ? "Independent QA Administrator" : "Q".repeat(100)]);
      await client.query("insert into credentials(user_id,password_hash,password_changed_at) values($1,$2,now())", [id, passwordHash]);
      await client.query("insert into user_roles(user_id,role) values($1,'developer')", [id]);
    }
    await client.query("insert into user_roles(user_id,role) values($1,'administrator')", [ids[0]]);
    await browser("cookies", "clear");
    stage = "default-and-github";
    await browser("open", `${baseUrl}/login`); await click("Continue with GitHub"); await wait("GitHub sign-in will be implemented soon.");
    await check("location.pathname==='/login'");
    await browser("fill", '[name="email"]', emails[0]); await browser("fill", '[name="password"]', password); await click("Sign in");
    await browser("wait", "--url", "**/account"); await wait("Your account");
    await browser("open", `${baseUrl}/admin/users`); await wait("Users");
    await search(emails[1]); await settled(); await wait(emails[1]); await shot("admin-long-content");
    stage = "keyboard";
    await browser("focus", '[name="q"]'); await browser("press", "Tab");
    await check("document.activeElement.textContent==='Search' && document.activeElement.matches(':focus-visible') && getComputedStyle(document.activeElement).outlineStyle==='solid'");
    stage = "synthetic-list-failure-retry";
    await intercept("/api/admin/users", "failure"); await search(emails[1]); await wait("Service temporarily unavailable");
    await shot("admin-error"); await restore(); await click("Try again"); await settled(); await wait(emails[1]);
    stage = "synthetic-list-loading";
    await intercept("/api/admin/users", "delay"); await search(emails[1]); await wait("Loading");
    await check("!document.querySelector('table')"); await shot("admin-loading");
    await evaluate("window.__qaRelease(); true"); await settled(); await restore();
    stage = "empty-and-recovery";
    await search("no-independent-fixture-can-match-this"); await wait("No results"); await shot("admin-empty");
    await search(emails[1]); await settled();
    stage = "synthetic-role-failure-retry";
    const form = `form[aria-label="Roles for ${emails[1]}"]`;
    await browser("scrollintoview", `${form} [name="mentor"]`);
    await browser("check", `${form} [name="mentor"]`);
    await intercept(`/api/admin/users/${ids[1]}/roles`, "failure"); await browser("scrollintoview", `${form} button[type=submit]`); await browser("click", `${form} button[type=submit]`); await wait("Service temporarily unavailable");
    assert.equal((await client.query("select count(*)::int as count from user_roles where user_id=$1 and role='mentor'", [ids[1]])).rows[0].count, 0);
    await restore(); await intercept(`/api/admin/users/${ids[1]}/roles`, "delay");
    await evaluate(`document.querySelector(${JSON.stringify(form)}).requestSubmit(); document.querySelector(${JSON.stringify(form)}).requestSubmit(); true`);
    await check("window.__qaCalls===1 && [...document.querySelectorAll('fieldset')].every(field=>field.disabled)");
    await evaluate("window.__qaRelease(); true"); await wait("Roles updated."); await settled(); await restore();
    assert.equal((await client.query("select count(*)::int as count from user_roles where user_id=$1 and role='mentor'", [ids[1]])).rows[0].count, 1);
    stage = "real-csrf-denial";
    await check(`(async()=>{const response=await fetch('/api/admin/users/${ids[1]}/roles',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({mentor:false,administrator:false})});return response.status===403})()`);
    assert.equal((await client.query("select count(*)::int as count from user_roles where user_id=$1 and role='mentor'", [ids[1]])).rows[0].count, 1);
    stage = "real-current-role-denial";
    await client.query("delete from user_roles where user_id=$1 and role='administrator'", [ids[0]]);
    await search(emails[1]); await wait("Access denied"); await check("!document.querySelector('table')"); await shot("admin-denied");
    stage = "missing-token";
    await browser("open", `${baseUrl}/reset-password`); await wait("Open the link from your email");
    await check("!document.querySelector('input[name=newPassword]')");
    await browser("open", `${baseUrl}/verify-email`); await wait("Open the link from your email");
    stage = "real-reset-token-privacy-and-replay";
    await browser("open", `${baseUrl}/forgot-password`); await browser("fill", '[name="email"]', emails[0]); await click("Send reset email"); await wait("If this address has an eligible account");
    const token = /reset-password#token=([A-Za-z0-9_-]{43})/.exec(messages.at(-1) ?? "")?.[1];
    assert.ok(token, "Expected owned SMTP reset message");
    await browser("open", `${baseUrl}/reset-password#token=${token}`);
    await check(`location.hash==='' && !document.documentElement.outerHTML.includes(${JSON.stringify(token)}) && !JSON.stringify(history.state).includes(${JSON.stringify(token)}) && sessionStorage.length===0 && localStorage.length===0`);
    await check("document.querySelector('meta[name=referrer]').content==='no-referrer'");
    await browser("fill", '[name="newPassword"]', "short"); await click("Change password"); await wait("Please correct the highlighted fields.");
    await check("document.activeElement.name==='newPassword'");
    await browser("fill", '[name="newPassword"]', "independent replacement password"); await click("Change password"); await wait("Password changed.");
    await browser("open", `${baseUrl}/account`); await browser("wait", "--url", "**/login");
    await browser("open", `${baseUrl}/reset-password#token=${token}`); await browser("fill", '[name="newPassword"]', "independent replacement password"); await click("Change password"); await wait("The link may be invalid, expired or already used.");
    await browser("open", `${baseUrl}/login`); await browser("fill", '[name="email"]', emails[0]); await browser("fill", '[name="password"]', password); await click("Sign in"); await wait("Unable to sign in.");
    await browser("fill", '[name="password"]', "independent replacement password"); await click("Sign in"); await browser("wait", "--url", "**/account"); await wait("Your account");
    await click("Sign out"); await browser("wait", "--url", "**/login");
    await browser("open", `${baseUrl}/account`); await browser("wait", "--url", "**/login");
    console.log("Independent QA passed: real login/roles/CSRF/reset/replay/logout, missing links, synthetic loading/error/retry, duplicate-submit protection, long content, keyboard and desktop/320px states.");
  } catch {
    throw new Error(`Independent QA failed at safe stage: ${stage}.`);
  } finally {
    try { await restore(); await browser("cookies", "clear"); }
    finally {
      try {
        await client.query("delete from action_tokens where user_id=any($1::uuid[])", [ids]);
        await client.query("delete from auth_sessions where user_id=any($1::uuid[])", [ids]);
        await client.query("delete from credentials where user_id=any($1::uuid[])", [ids]);
        await client.query("delete from user_roles where user_id=any($1::uuid[])", [ids]);
        await client.query("delete from users where id=any($1::uuid[])", [ids]);
      } finally { await client.end(); }
    }
  }
}
