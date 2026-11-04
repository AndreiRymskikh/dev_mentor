import assert from "node:assert/strict";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { Client } from "pg";
import type { IntegrationContext } from "../context";
import { integrationConfig as config } from "../config";
/** Reuses only the disposable prices scenario's owned fixture, never developer data. */
export async function testMentorHome(context: IntegrationContext, client: Client, userId: string, ownerCookie: string, internalBaseUrl: string) {
 const { browser, baseUrl, artifacts }=context;
 const click=(name:string)=>browser("find","role","button","click","--name",name,"--exact"), wait=(text:string)=>browser("wait","--text",text);
 const request=(pathname:string)=>fetch(internalBaseUrl+pathname,{method:"POST",headers:{cookie:ownerCookie,origin:baseUrl,"X-DevMentor-CSRF":"1"},signal:AbortSignal.timeout(config.authRequestTimeoutMs)});
 await client.query("delete from slots where mentor_profile_id=$1",[userId]);
 await client.query("update mentor_profiles set published_at=null,price_25_cents=null,price_50_cents=null where user_id=$1",[userId]);
 await browser("set","media","light");await browser("set","viewport","1440","1000");await browser("open",`${baseUrl}/mentor`);await wait("0 of 3 steps complete");await wait("No times published");await wait("Publish your profile before sharing");
 await browser("wait","--fn","document.querySelectorAll('.dm-mentor-home form').length === 2 && !document.querySelector('.dm-home-share a[href^=\"/m/\"]')");
 await browser("wait","--fn","getComputedStyle(document.querySelector('.dm-workspace')).display === 'flex' && getComputedStyle(document.querySelector('.dm-workspace-sidebar')).display === 'flex' && parseFloat(getComputedStyle(document.querySelector('.dm-home-setup')).paddingLeft) > 0");
 await browser("screenshot",path.join(artifacts,"mentor-home-initial.png"),"--full");
 assert.equal((await request("/api/mentors/me/publish")).status,200);
 await browser("reload");await wait("1 of 3 steps complete");await wait("View public profile");
 await browser("fill",'[name="price25"]',"89");await browser("fill",'[name="price50"]',"180");await click("Save both prices");await wait("90.00–600.00, inclusive");await browser("wait","--fn","document.activeElement.name === 'price25'");await wait("1 of 3 steps complete");
 await browser("fill",'[name="price25"]',"180");await browser("fill",'[name="price50"]',"320");
 await browser("eval","(()=>{const real=window.fetch.bind(window);window.homePriceSaves=0;window.fetch=(url,options)=>{if(url==='/api/mentors/me/prices'&&options?.method==='PUT'){window.homePriceSaves++;if(window.homePriceSaves===1)return Promise.resolve(Response.json({ok:false,error:{code:'OFFLINE',message:'Home save outage'}},{status:503}));return new Promise(resolve=>setTimeout(()=>resolve(real(url,options)),400));}return real(url,options);};})()");
 await click("Save both prices");await wait("Home save outage");await wait("1 of 3 steps complete");
 await browser("eval","(()=>{const form=document.querySelector('#session-prices form');form.requestSubmit();form.requestSubmit();})()");await wait("Both prices saved");await wait("2 of 3 steps complete");await browser("wait","--fn","window.homePriceSaves === 2");
 await browser("screenshot",path.join(artifacts,"mentor-home-partial.png"),"--full");
 const start=new Date(Date.now()+5*86400000);start.setUTCSeconds(0,0);const utc=start.toISOString().slice(0,16);
 await browser("fill",'[name="startsAt"]',utc);await click("Publish start");await wait("3 of 3 steps complete");await wait("Your profile is ready to share");
 assert.equal((await client.query("select starts_at from slots where mentor_profile_id=$1",[userId])).rows[0].starts_at.toISOString(),start.toISOString());
 await browser("wait","--fn","document.querySelector('.dm-slot-list').innerText.includes('UTC') && document.querySelector('.dm-slot-list button').innerText === 'Remove'");
 await browser("fill",'[name="price25"]',"199.99");await browser("fill",'[name="startsAt"]',"2026-12-02T14:30");
 await browser("eval","(()=>{const real=window.fetch.bind(window);window.fetch=(url,options)=>url==='/api/mentors/me/prices'&&!options?.method?Promise.resolve(Response.json({ok:false,error:{code:'OFFLINE',message:'Home readiness outage'}},{status:503})):real(url,options);document.querySelector('[name=price25]').dataset.identity='retained';document.dispatchEvent(new Event('visibilitychange'));})()");
 await wait("Home readiness outage");await browser("wait","--fn","!document.querySelector('.dm-home-setup progress') && !document.querySelector('.dm-home-share a[href^=\"/m/\"]') && document.querySelector('[name=price25]').value === '199.99'");
 await browser("reload");await wait("3 of 3 steps complete");
 for(const theme of ["light","dark"]){await browser("set","media",theme);for(const width of [1440,390,320]){await browser("set","viewport",String(width),"1000");await browser("wait","--fn",`document.documentElement.scrollWidth <= innerWidth && getComputedStyle(document.querySelector('.dm-workspace-sidebar')).display === '${width<=768?"none":"flex"}'`);await browser("screenshot",path.join(artifacts,`mentor-home-ready-${theme}-${width}.png`),"--full");}}
 await browser("eval","document.querySelector('.dm-slot-list [role=region]').scrollLeft=10000");await click("Remove");await wait("Start removed");await wait("2 of 3 steps complete");
 await client.query("delete from user_roles where user_id=$1 and role='mentor'",[userId]);await browser("eval","document.dispatchEvent(new Event('visibilitychange'))");await wait("Mentor access is required");await browser("wait","--fn","!document.querySelector('.dm-mentor-home form') && !document.querySelector('.dm-mentor-home table') && !document.querySelector('.dm-home-share a')");
 // Restore this scenario's fixture for the existing standalone consumer checks.
 await client.query("insert into user_roles(user_id,role) values($1,'mentor')",[userId]);
 await client.query("update mentor_profiles set price_25_cents=9010,price_50_cents=18000 where user_id=$1",[userId]);
 await client.query("insert into slots(id,mentor_profile_id,starts_at) values($1,$2,$3)",[randomUUID(),userId,new Date(Date.now()+4*3600000)]);
 await browser("set","viewport","1280","1000");await browser("set","media","light");
 console.log("Mentor home browser passed: 0/1/2/3 progress, publication, atomic save validation/failure/retry/duplicates, exact UTC, lower table/removal/share, stale-read failure, revocation and responsive themes.");
}
