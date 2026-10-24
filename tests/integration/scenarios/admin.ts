import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { hash } from "bcryptjs";
import { Client } from "pg";
import type { IntegrationContext } from "../context";
export async function testAdmin({ baseUrl, artifacts, browser }: IntegrationContext, databaseUrl: string, internalBaseUrl: string) {
  let stage = "fixture";
  const client = new Client({ connectionString: databaseUrl }); const ids = Array.from({ length: 23 }, () => randomUUID());
  const password = "admin browser password"; const prefix = "phase5-browser";
  const email = (index: number) => `${prefix}-${String(index).padStart(2, "0")}@example.test`;
  const click = (name: string) => browser("find", "role", "button", "click", "--name", name, "--exact");
  const wait = (text: string) => browser("wait", "--text", text);
  const search = async (q: string) => { await browser("fill", '[name="q"]', q); await click("Search"); await browser("wait", "--fn", "!document.querySelector('[role=alert]') && !document.querySelector('.users-table [role=status]') && !!document.querySelector('table, .users-table > p')"); };
  const login = async (index: number) => { stage = "login-fixture-" + index; await browser("cookies", "clear"); await browser("open", `${baseUrl}/login`); await browser("fill", '[name="email"]', email(index)); await browser("fill", '[name="password"]', password); await click("Sign in"); await browser("wait", "--url", "**/account"); await wait("Your account"); };
  const roles = async (index: number, mentor: boolean, admin: boolean) => {
    stage = "roles-fixture-" + index; await search(email(index)); await wait(email(index));
    const form = `form[aria-label="Roles for ${email(index)}"]`;
    await browser(mentor ? "check" : "uncheck", `${form} [name="mentor"]`);
    await browser(admin ? "check" : "uncheck", `${form} [name="administrator"]`);
    await browser("click", `${form} button[type="submit"]`);
  };
  try {
    await client.connect(); const passwordHash = await hash(password, 12);
    await client.query("delete from rate_limit_buckets");
    for (const [index, id] of ids.entries()) {
      await client.query("insert into users(id,normalized_email,display_name,email_verified_at,created_at,updated_at) values($1,$2,$3,now(),now(),now())", [id, email(index), `${prefix} ${String(index).padStart(2, "0")} with a sufficiently long display name`]);
      await client.query("insert into credentials(user_id,password_hash,password_changed_at) values($1,$2,now())", [id, passwordHash]);
      await client.query("insert into user_roles(user_id,role) values($1,'developer')", [id]);
      if (index < 2) await client.query("insert into user_roles(user_id,role) values($1,'administrator')", [id]);
    }
    stage = "anonymous-http";
    for (const pathname of ["/admin", "/admin/users"]) {
      const result = await fetch(`${internalBaseUrl}${pathname}`, { redirect: "manual" }); assert.equal(result.status, 307); assert.equal(result.headers.get("location"), "/login"); assert.match(result.headers.get("cache-control") ?? "", /no-store/);
    }
    await browser("cookies", "clear"); await browser("open", `${baseUrl}/admin`); await browser("wait", "--url", "**/login");
    await login(2); stage = "mentor-enrollment"; await click("Become a mentor"); await wait("mentor");
    assert.equal((await client.query("select count(*)::int as count from user_roles where user_id=$1 and role='mentor'", [ids[2]])).rows[0].count, 1);
    stage = "nonadministrator-pages";
    for (const pathname of ["/admin", "/admin/users"]) { await browser("open", `${baseUrl}${pathname}`); await wait("Access denied"); await browser("wait", "--fn", `!document.body.innerText.includes(${JSON.stringify(email(0))})`); }
    await login(0); await browser("find", "role", "link", "click", "--name", "Manage users", "--exact"); await browser("wait", "--url", "**/admin/users"); await wait("Users");
    await browser("open", `${baseUrl}/admin`); await browser("wait", "--url", "**/admin/users");
    stage = "pagination"; await search(prefix); await wait("Page 1 of 2"); await click("Next"); await wait("Page 2 of 2"); await click("Previous"); await wait("Page 1 of 2");
    stage = "responsive-screenshots";
    for (const [width, height, name] of [[1280, 1000, "desktop"], [320, 900, "mobile"]] as const) {
      await browser("set", "viewport", String(width), String(height)); await browser("wait", "--fn", "document.documentElement.scrollWidth <= innerWidth");
      await browser("wait", "--fn", "getComputedStyle(document.querySelector('.users-table')).overflowX === 'auto'");
      if (width === 320) await browser("wait", "--fn", "document.querySelector('table').getBoundingClientRect().width > innerWidth && document.querySelector('.users-table').scrollWidth > document.querySelector('.users-table').clientWidth");
      await browser("screenshot", path.join(artifacts, `admin-users-${name}.png`));
    }
    await browser("set", "viewport", "1280", "1000");
    stage = "empty-search"; await search("no-such-phase5-user"); await wait("No results");
    await roles(2, true, true); await wait("Roles updated.");
    assert.equal((await client.query("select count(*)::int as count from user_roles where user_id=$1 and role='administrator'", [ids[2]])).rows[0].count, 1);
    await roles(2, false, false); await wait("Roles updated.");
    assert.deepEqual((await client.query("select role from user_roles where user_id=$1", [ids[2]])).rows.map(row => row.role), ["developer"]);
    await roles(1, false, false); await wait("Roles updated.");
    await roles(0, false, false); await wait("The last verified administrator cannot be removed.");
    await roles(1, false, true); await wait("Roles updated.");
    await roles(0, true, false); stage = "self-demotion-denial"; await wait("Access denied");
    // Already-authorized SSR bytes remain in framework hydration scripts; assert visible
    // content and table removal, without attempting to erase delivered script payloads.
    await browser("wait", "--fn", `!document.body.innerText.includes(${JSON.stringify(email(0))}) && !document.querySelector('table')`);
    stage = "self-demoted-account"; await browser("open", `${baseUrl}/account`); await wait("mentor"); await browser("wait", "--fn", "!document.querySelector('a[href=\"/admin/users\"]')");
    // Existing session must use current memberships immediately on both page entry points.
    stage = "self-demoted-new-entry"; await browser("open", `${baseUrl}/admin/users`); await wait("Access denied");
    await login(1); await browser("open", `${baseUrl}/admin/users`); await wait("Users");
    stage = "revoked-session-search"; await client.query("update auth_sessions set revoked_at=now() where user_id=$1 and revoked_at is null", [ids[1]]);
    await browser("fill", '[name="q"]', prefix); await click("Search"); await browser("wait", "--url", "**/login");
    await browser("wait", "--fn", "!document.querySelector('table')");
    console.log("Admin browser tests passed: anonymous/non-admin protection, mentor enrollment, admin navigation, search/paging/empty, grants/revocations, last-admin/self-demotion and responsive table.");
  } catch {
    throw new Error(`Admin browser scenario failed at safe stage: ${stage}.`);
  } finally {
    try { await browser("cookies", "clear"); } finally {
    try {
    await client.query("delete from auth_sessions where user_id=any($1::uuid[])", [ids]);
    await client.query("delete from credentials where user_id=any($1::uuid[])", [ids]);
    await client.query("delete from user_roles where user_id=any($1::uuid[])", [ids]);
    await client.query("delete from users where id=any($1::uuid[])", [ids]);
    } finally { await client.end(); }
    }
  }
}
