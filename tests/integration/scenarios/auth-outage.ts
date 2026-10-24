import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { hash } from "bcryptjs";
import { Client } from "pg";
import type { IntegrationContext } from "../context";
import { integrationConfig as config } from "../config";

/** Only the runner-owned database role is changed; retained controller restores it. */
export async function testAuthOutage({ baseUrl, browser }: IntegrationContext, databaseUrl: string, internalBaseUrl: string) {
  const controller = new Client({ connectionString: databaseUrl });
  const id=randomUUID(), email=`outage-${id}@example.test`, password="outage fixture password";
  let loginDisabled=false;
  try {
    await controller.connect();
    assert.equal((await controller.query("select current_user as name, current_database() as db")).rows[0].name,"devmentor_test");
    assert.equal((await controller.query("select current_database() as db")).rows[0].db,"devmentor_integration");
    await controller.query("insert into users(id,normalized_email,display_name,email_verified_at,created_at,updated_at) values($1,$2,'Outage fixture',now(),now(),now())",[id,email]);
    await controller.query("insert into credentials(user_id,password_hash,password_changed_at) values($1,$2,now())",[id,await hash(password,12)]);
    await controller.query("insert into user_roles(user_id,role) values($1,'developer'),($1,'administrator')",[id]);
    const post=(route:string,body:unknown,cookie?:string)=>fetch(internalBaseUrl+route,{method:"POST",headers:{"content-type":"application/json","X-DevMentor-CSRF":"1",origin:baseUrl,...(cookie?{cookie}:{})},body:JSON.stringify(body),signal:AbortSignal.timeout(config.authRequestTimeoutMs)});
    const response=await post("/api/auth/login",{email,password});assert.equal(response.status,200);
    const cookie=response.headers.get("set-cookie")!.split(";")[0];
    await browser("cookies","clear");await browser("open",`${baseUrl}/login`);
    await browser("fill",'[name="email"]',email);await browser("fill",'[name="password"]',password);
    await browser("find","role","button","click","--name","Sign in","--exact");await browser("wait","--url","**/account");
    // Deny new connections and terminate only this disposable database's other
    // same-role connections. Controller remains connected to guarantee restoration.
    await controller.query("alter role devmentor_test nologin"); loginDisabled=true;
    await controller.query("select pg_terminate_backend(pid) from pg_stat_activity where datname=current_database() and usename=current_user and pid<>pg_backend_pid()");
    const get=(route:string)=>fetch(internalBaseUrl+route,{headers:{cookie},signal:AbortSignal.timeout(config.authRequestTimeoutMs)});
    for(const route of ["/api/auth/session","/api/admin/users"]) {
      const failed=await get(route);assert.equal(failed.status,503);assert.equal(failed.headers.get("cache-control"),"no-store");
      assert.deepEqual(await failed.json(),{ok:false,error:{code:"SERVICE_UNAVAILABLE",message:"Service temporarily unavailable"}});
    }
    for(const [route,body] of [["/api/auth/login",{email,password}],["/api/auth/register",{email:"outage-register@example.test",displayName:"Outage",password}],["/api/users/me/mentor",{}]] as const) {
      const failed=await post(route,body,cookie);assert.equal(failed.status,503);assert.equal(failed.headers.get("set-cookie"),null);assert.equal(failed.headers.get("cache-control"),"no-store");
      assert.equal((await failed.json()).error.code,"SERVICE_UNAVAILABLE");
    }
    assert.equal((await get("/api/health")).status,200);assert.equal((await get("/")).status,200);
    await browser("open",`${baseUrl}/account`);await browser("wait","--text","Account temporarily unavailable");
    await browser("wait","--fn","!document.querySelector('a[href=\"/admin/users\"]') && !document.querySelector('button') && !document.body.innerText.includes('Outage fixture')");
    await browser("open",`${baseUrl}/admin/users`);await browser("wait","--text","Administration temporarily unavailable");
    await browser("wait","--fn","!document.querySelector('table') && !document.body.innerText.includes('Outage fixture')");
    await controller.query("alter role devmentor_test login");loginDisabled=false;
    // Failed lazy/pool connections must recover without restarting the app.
    assert.equal((await get("/api/auth/session")).status,200);
    assert.equal((await get("/api/admin/users")).status,200);
    await browser("open",`${baseUrl}/account`);await browser("wait","--text","Your account");
    console.log("Real database outage passed: session/admin/mutations fail closed, no cookie/private UI, health/static independence and same-process recovery.");
  } finally {
    try {
      if(loginDisabled) await controller.query("alter role devmentor_test login");
      await browser("cookies","clear");
    } finally {
      try {
        await controller.query("delete from auth_sessions where user_id=$1",[id]);
        await controller.query("delete from credentials where user_id=$1",[id]);
        await controller.query("delete from user_roles where user_id=$1",[id]);
        await controller.query("delete from users where id=$1",[id]);
      } finally { await controller.end(); }
    }
  }
}
