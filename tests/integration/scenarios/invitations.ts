import { seedPendingInvitation } from "../fixtures/mentor";
import { expectAbsent } from "../assertions";
import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { hash } from "bcryptjs";
import { Client } from "pg";
import { SessionJwt } from "../../../packages/core/src/services/sessions/jwt";
import type { IntegrationContext } from "../context";
import { integrationConfig as config } from "../config";

export async function testInvitationFlow({baseUrl,artifacts,browser}:IntegrationContext,databaseUrl:string,jwtSecret:string,internalBaseUrl:string,messages:string[]) {
  const client=new Client({connectionString:databaseUrl}), ids=[randomUUID(),randomUUID()];const email=`invitation-${randomUUID()}@example.test`,other=`other-${randomUUID()}@example.test`,password="invitation browser password";let stage="fixture";
  const click=(name:string)=>browser("find","role","button","click","--name",name,"--exact");
  const wait=(text:string)=>browser("wait","--text",text);
  await client.connect();
  try {
    const passwordHash=await hash(password,12);await client.query("delete from rate_limit_buckets");
    for(const [index,id]of ids.entries()){await client.query("insert into users(id,normalized_email,display_name,email_verified_at,created_at,updated_at) values($1,$2,$3,now(),now(),now())",[id,index?other:email,"Invited engineer"]);await client.query("insert into credentials(user_id,password_hash,password_changed_at) values($1,$2,now())",[id,passwordHash]);await client.query("insert into user_roles(user_id,role) values($1,'developer')",[id]);}
    const execute=promisify(execFile);stage="operator-create";const {stdout}=await execute("npm",["run","invite","--","create","integration-operator",email,"react"],{env:{...process.env,DATABASE_URL:databaseUrl,APP_ORIGIN:baseUrl},timeout:config.operatorCommandTimeoutMs});const token=/\/invitation\/([A-Za-z0-9_-]{43})/.exec(stdout)?.[1];assert.ok(token);assert.match(stdout,/invitation.create operator=integration-operator id=/);
    const rows=await client.query("select id,token_hash from invitations where email=$1",[email]);assert.equal(rows.rowCount,1);assert.equal(rows.rows[0].token_hash,createHash("sha256").update(token).digest("hex"));
    const request=(suffix:string,cookie?:string,body?:string)=>fetch(internalBaseUrl+suffix,{method:body===undefined?"GET":"POST",headers:{...(cookie?{cookie}:{}),origin:baseUrl,"Content-Type":"application/json","X-DevMentor-CSRF":"1"},...(body===undefined?{}:{body}),signal:AbortSignal.timeout(config.authRequestTimeoutMs)});
    stage="http-denials";assert.equal((await request(`/api/invitations/${token}/accept`,undefined,"{}")).status,401);
    const sid=randomUUID();await client.query("insert into auth_sessions(id,user_id,expires_at) values($1,$2,$3)",[sid,ids[1],new Date(Date.now()+86400000)]);const mismatchCookie=`__Host-devmentor-session=${await new SessionJwt(()=>jwtSecret).sign(ids[1],sid,Math.floor(Date.now()/1000))}`;
    assert.equal((await request(`/api/invitations/${token}/accept`,mismatchCookie,"{}")).status,403);const unknown=await request(`/api/invitations/${"z".repeat(43)}`);assert.equal(unknown.status,404);const invalidBody=await unknown.json();
    const expired=await seedPendingInvitation(client,{email:other,expiresAt:new Date(Date.now()-1000),stackTags:[]});const expiredResponse=await request(`/api/invitations/${expired.token}`);assert.equal(expiredResponse.status,404);assert.deepEqual(await expiredResponse.json(),invalidBody);await client.query("update invitations set expires_at=$1,revoked_at=now() where id=$2",[new Date(Date.now()+86400000),expired.id]);const revokedResponse=await request(`/api/invitations/${expired.token}`);assert.equal(revokedResponse.status,404);assert.deepEqual(await revokedResponse.json(),invalidBody);
    stage="invalid-page";await browser("cookies","clear");await browser("open",`${baseUrl}/invitation/${"z".repeat(43)}`);await wait("This invitation is not valid");
    stage="mismatch-page";await browser("open",`${baseUrl}/login`);await browser("fill",'[name="email"]',other);await browser("fill",'[name="password"]',password);await click("Sign in");await browser("wait","--url","**/account");await browser("open",`${baseUrl}/invitation/${token}`);await wait("Manage your account");await browser("wait","--fn","!document.querySelector('.dm-invitation-card button')");await browser("screenshot","--full",path.join(artifacts,"invitation-mismatch.png"));await browser("cookies","clear");
    stage="login-continuation";await browser("set","viewport","1440","1000");await browser("open",`${baseUrl}/invitation/${token}`);await wait("You’re invited to mentor");await wait("within 9 days of accepting");await expectAbsent(browser);await browser("wait","--fn", "!!document.querySelector('.dm-public-header') && !!document.querySelector('.dm-public-footer') && !!document.querySelector('time[datetime]')");await browser("screenshot","--full",path.join(artifacts,"invitation-signed-out-desktop.png"));await browser("find","role","link","click","--name","Sign in to accept","--exact");await browser("fill",'[name="email"]',email);await browser("fill",'[name="password"]',password);await click("Sign in");await browser("wait","--url","**/invitation/*");await wait("Accept invitation");
    for(const [width,name]of [[1440,"desktop"],[768,"tablet"],[390,"phone"],[320,"mobile"]]as const){await browser("set","viewport",String(width),"900");await browser("wait","--fn","document.documentElement.scrollWidth <= innerWidth");await browser("screenshot","--full",path.join(artifacts,`invitation-${name}.png`));}
    await browser("set","media","dark");await browser("screenshot","--full",path.join(artifacts,"invitation-dark-mobile.png"));await browser("set","media","light");
    stage="accept-and-refresh";const deadlineNotBefore=Date.now()+9*86400000;await click("Accept invitation");await browser("wait","--url","**/mentor");await wait("Publish at least one bookable session");await expectAbsent(browser);await browser("open",`${baseUrl}/mentor`);await wait("Publish at least one bookable session");await browser("wait","--fn","!!document.querySelector('time[datetime]')");await browser("screenshot","--full",path.join(artifacts,"mentor-deadline-mobile.png"));
    const state=await client.query("select i.accepted_by_id,i.publish_due_at,p.initial_publish_due_at from invitations i join mentor_profiles p on p.user_id=i.accepted_by_id where i.email=$1",[email]);assert.equal(state.rows[0].accepted_by_id,ids[0]);assert.equal(state.rows[0].publish_due_at.getTime(),state.rows[0].initial_publish_due_at.getTime());assert.ok(state.rows[0].publish_due_at.getTime()>=deadlineNotBefore && state.rows[0].publish_due_at.getTime()<=Date.now()+9*86400000,"persisted deadline uses configured window");assert.equal((await client.query("select count(*)::int count from auth_sessions where user_id=$1",[ids[0]])).rows[0].count,1,"acceptance preserves original session");
    await browser("open",`${baseUrl}/account`);await browser("find","role","button","click","--name","Open navigation","--exact");await wait("Mentor home");await browser("open",`${baseUrl}/invitation/${token}`);await wait("This invitation is not valid");assert.equal((await request(`/api/invitations/${token}/accept`,mismatchCookie,"{}")).status,404);
    stage="self-service-preserved";const enrollment=await request("/api/users/me/mentor",mismatchCookie,"{}");assert.equal(enrollment.status,200);const onboarding=await request("/api/mentors/me/onboarding",mismatchCookie);assert.equal(onboarding.status,200);assert.deepEqual((await onboarding.json()).data,{initialPublishDueAt:null});
    stage="registration-interruption";await browser("cookies","clear");await client.query("delete from rate_limit_buckets");
    const newEmail=`invitation-register-${randomUUID()}@example.test`;const fresh=await seedPendingInvitation(client,{email:newEmail,expiresAt:new Date(Date.now()+86400000),stackTags:["react"]});
    try {
      await browser("open",`${baseUrl}/invitation/${fresh.token}`);await wait("You’re invited to mentor");
      await browser("find","role","link","click","--name","Sign in to accept","--exact");
      await browser("find","role","link","click","--name","Create account","--exact");
      await browser("fill",'[name="displayName"]',"New invited mentor");await browser("fill",'[name="email"]',newEmail);await browser("fill",'[name="password"]',password);
      const before=messages.length;await click("Create account");await wait("Check your inbox");assert.equal(messages.length,before+1);
      const verification=/verify-email#token=([A-Za-z0-9_-]{43})/.exec(messages.at(-1)!)?.[1];assert.ok(verification);
      // A fresh email navigation has no invitation query; bounded first-party state restores it.
      await browser("open",`${baseUrl}/verify-email#token=${verification}`);await click("Verify email");await wait("Your email is verified");
      await browser("find","role","link","click","--name","Sign in","--exact");await browser("fill",'[name="email"]',newEmail);await browser("fill",'[name="password"]',password);await click("Sign in");
      await browser("wait","--url","**/invitation/*");await wait("Accept as New invited mentor");
      const sessionBefore=await client.query("select s.id from auth_sessions s join users u on u.id=s.user_id where u.normalized_email=$1 and s.revoked_at is null",[newEmail]);assert.equal(sessionBefore.rowCount,1);
      await click("Accept invitation");await browser("wait","--url","**/mentor");await wait("Publish at least one bookable session");
      const sessionAfter=await client.query("select s.id from auth_sessions s join users u on u.id=s.user_id where u.normalized_email=$1 and s.revoked_at is null",[newEmail]);assert.deepEqual(sessionAfter.rows,sessionBefore.rows);
      await browser("open",`${baseUrl}/api/auth/session`);assert.match((await browser("snapshot")).data?.snapshot??"",/mentor/);
    } finally {
      await browser("cookies","clear");await client.query("delete from invitations where id=$1",[fresh.id]);
      const found=await client.query("select id from users where normalized_email=$1",[newEmail]);
      for(const row of found.rows){await client.query("delete from mentor_profiles where user_id=$1",[row.id]);await client.query("delete from auth_sessions where user_id=$1",[row.id]);await client.query("delete from action_tokens where user_id=$1",[row.id]);await client.query("delete from credentials where user_id=$1",[row.id]);await client.query("delete from user_roles where user_id=$1",[row.id]);await client.query("delete from users where id=$1",[row.id]);}
    }
    console.log("Invitation browser/HTTP passed: operator digest, denials, login continuation, one-time acceptance, preserved session/deadline and optional self-service.");
  }catch{throw new Error(`Invitation flow failed at safe stage: ${stage}.`);}
  finally{try{await browser("cookies","clear");await browser("set","viewport","1280","1000");}finally{try{await client.query("delete from invitations where email=any($1::text[])",[[email,other]]);await client.query("delete from mentor_profiles where user_id=any($1::uuid[])",[ids]);await client.query("delete from auth_sessions where user_id=any($1::uuid[])",[ids]);await client.query("delete from credentials where user_id=any($1::uuid[])",[ids]);await client.query("delete from user_roles where user_id=any($1::uuid[])",[ids]);await client.query("delete from users where id=any($1::uuid[])",[ids]);}finally{await client.end();}}}
}
