import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import path from "node:path";
import {hash} from "bcryptjs";
import {Client} from "pg";
import type {IntegrationContext} from "../context";
import {integrationConfig as config} from "../config";
import type {MentorCatalog} from "../../../packages/core/src/validators/mentors";
/** Public HTTP + real production browser; all fixtures belong to the disposable DB. */
export async function testCatalogFlow({baseUrl,artifacts,browser}:IntegrationContext,databaseUrl:string,internalBaseUrl:string) {
  const client=new Client({connectionString:databaseUrl}), ids=Array.from({length:17},()=>randomUUID()),password="Catalog browser fixture password";
  const request=(query="")=>fetch(`${internalBaseUrl}/api/mentors${query}`,{signal:AbortSignal.timeout(config.authRequestTimeoutMs)});
  const get=async(query=""):Promise<MentorCatalog>=>{const response=await request(query);assert.equal(response.status,200);assert.equal(response.headers.get("cache-control"),"no-store");return (await response.json()).data;};
  const clickLink=(name:string)=>browser("find","role","link","click","--name",name,"--exact");
  let stage="empty";
  await client.connect();
  try {
    assert.deepEqual((await get()).items,[]);
    await browser("cookies","clear");await browser("open",`${baseUrl}/mentors`);await browser("wait","--text","No mentors have published a profile yet.");
    await browser("screenshot",path.join(artifacts,"catalog-empty.png"),"--full");
    stage="fixtures";
    for(const [i,id] of ids.entries()) {
      await client.query("insert into users(id,normalized_email,display_name,email_verified_at,created_at,updated_at) values($1,$2,$3,$4,now(),now())",[id,`catalog-${id}@example.test`,`Catalog mentor ${String(i).padStart(2,"0")}`,i===15?null:new Date()]);
      await client.query("insert into user_roles(user_id,role) values($1,'developer')",[id]);
      if(i!==14) await client.query("insert into user_roles(user_id,role) values($1,'mentor')",[id]);
      await client.query("insert into mentor_profiles(user_id,slug,published_at,bio,stack_tags,price_25_cents,price_50_cents) values($1,$2,$3,$4,ARRAY['react'], $5, $6)",[id,`catalog-${id}`,i===16?null:new Date(Date.now()-i*1000),"I help developers understand and improve their React applications.",i===1?1:9000,i===2?null:18000]);
    }
    await client.query("insert into credentials(user_id,password_hash,password_changed_at) values($1,$2,now())",[ids[0],await hash(password,12)]);
    await client.query("insert into slots(id,mentor_profile_id,starts_at) values($1,$2,$3)",[randomUUID(),ids[0],new Date(Date.now()+4*3600000)]);
    stage="http";
    for(const query of ["?limit=25","?limit=0","?limit=1&limit=2","?after=bad","?after=a&after=b","?ownerId=private","?after=%27%20OR%201%3D1"])assert.equal((await request(query)).status,422);
    const first=await get();assert.equal(first.items.length,12);assert.ok(first.nextCursor);assert.equal(first.items[0].displayName,"Catalog mentor 00");assert.equal(first.items[0].offer.mentorOfferReady,true);assert.equal(first.items[0].offer.bookingAvailable,false);
    assert.equal(first.items[1].offer.prices,null);assert.equal(first.items[2].offer.prices,null);assert.equal(first.items[1].offer.readiness.availability,false);
    assert.deepEqual(Object.keys(first.items[0]).sort(),["bio","displayName","offer","slug","stackTags"]);
    assert.ok(!JSON.stringify(first.items).includes("@example.test"));assert.ok(!JSON.stringify(first.items).includes("initialPublishDueAt"));
    const second=await get(`?after=${encodeURIComponent(first.nextCursor!)}`);assert.equal(second.items.length,2);assert.equal(second.nextCursor,null);assert.equal(second.items[0].displayName,"Catalog mentor 12");
    assert.equal(new Set([...first.items,...second.items].map(x=>x.slug)).size,14);
    stage="public-browser";
    await browser("open",`${baseUrl}/mentors`);await browser("wait","--text","Catalog mentor 00");await browser("wait","--fn","document.activeElement?.tagName === 'H1'");
    await browser("wait","--text","25 minutes: PLN 90.00");await browser("wait","--text","Prices are not set within current bounds.");
    await browser("wait","--fn","!document.querySelector('a[href*=book]') && document.querySelectorAll('table tbody tr').length === 12");
    for(const theme of ["light","dark"]) {await browser("set","media",theme);for(const width of [1440,390,320]){await browser("set","viewport",String(width),"900");await browser("wait","--fn","document.documentElement.scrollWidth <= innerWidth");await browser("wait","--fn","parseFloat(getComputedStyle(document.querySelector('td')).paddingLeft) >= 16 && getComputedStyle(document.querySelector('h1')).fontSize !== getComputedStyle(document.querySelector('main > p')).fontSize");await browser("screenshot",path.join(artifacts,`catalog-${theme}-${width}.png`),"--full");}}
    stage="keyboard-profile";
    await browser("eval","document.querySelector('a[aria-label=\"View profile: Catalog mentor 00\"]').focus()");await browser("press","Enter");await browser("wait","--url",`**/m/catalog-${ids[0]}`);await browser("wait","--text","Catalog mentor 00");
    await clickLink("Mentors");await browser("wait","--url","**/mentors");await browser("wait","--text","Catalog mentor 00");
    stage="pagination";
    await clickLink("Next mentors");await browser("wait","--text","Catalog mentor 12");await browser("wait","--fn","document.querySelectorAll('table tbody tr').length === 2 && !Array.from(document.querySelectorAll('a')).some(a=>a.textContent==='Next mentors')");
    await clickLink("Back to first page");await browser("wait","--text","Catalog mentor 00");
    stage="failure-retry";
    await browser("eval","(()=>{const real=window.fetch.bind(window);window.fetch=(url,options)=>{if(String(url).startsWith('/api/mentors')&&!String(url).includes('/api/mentors/')){window.fetch=real;return Promise.resolve(Response.json({ok:false,error:{code:'UNAVAILABLE',message:'Catalog outage fixture'}},{status:503}));}return real(url,options);};document.dispatchEvent(new Event('visibilitychange'));})()");
    await browser("wait","--text","Catalog outage fixture");await browser("wait","--fn","!document.querySelector('table')");await browser("screenshot",path.join(artifacts,"catalog-error.png"),"--full");
    await browser("find","role","button","click","--name","Try again","--exact");await browser("wait","--text","Catalog mentor 00");
    stage="loading";
    await browser("eval",`(()=>{const real=window.fetch.bind(window);window.fetch=(url,options)=>{if(String(url)==='/api/mentors'){window.fetch=real;return new Promise(resolve=>{window.finishCatalogLoad=()=>resolve(real(url,options));});}return real(url,options);};document.dispatchEvent(new Event('visibilitychange'));})()`);
    await browser("wait","--text","Loading");await browser("wait","--fn","!document.querySelector('table')");await browser("eval","window.finishCatalogLoad()");await browser("wait","--text","Catalog mentor 00");
    stage="current-visibility";
    await client.query("update mentor_profiles set published_at=null where user_id=$1",[ids[0]]);await browser("eval","document.dispatchEvent(new Event('visibilitychange'))");await browser("wait","--fn","!document.querySelector('[aria-label=\"View profile: Catalog mentor 00\"]') && !!document.querySelector('table')");assert.equal((await fetch(`${internalBaseUrl}/m/catalog-${ids[0]}`)).status,404);
    await client.query("delete from user_roles where user_id=$1 and role='mentor'",[ids[1]]);assert.equal((await get()).items.some(x=>x.slug===`catalog-${ids[1]}`),false);assert.equal((await fetch(`${internalBaseUrl}/api/mentors/catalog-${ids[1]}`)).status,404);
    stage="unavailable-profile-navigation";
    await browser("open",`${baseUrl}/m/catalog-${ids[0]}`);await browser("wait","--text","Mentor profile not available");
    await browser("eval","document.querySelector('a[href=\"/mentors\"]').focus()");await browser("press","Enter");await browser("wait","--url","**/mentors");await browser("wait","--text","Catalog mentor 02");
    stage="account-navigation";
    await browser("open",`${baseUrl}/login`);await browser("fill",'[name="email"]',`catalog-${ids[0]}@example.test`);await browser("fill",'[name="password"]',password);await browser("find","role","button","click","--name","Sign in","--exact");await browser("wait","--url","**/account");
    await browser("wait","--text","Find a mentor");await browser("wait","--fn","Array.from(document.querySelectorAll('a')).filter(a=>['Browse mentors','Find a mentor'].includes(a.textContent)).length === 2 && Array.from(document.querySelectorAll('a')).filter(a=>['Browse mentors','Find a mentor'].includes(a.textContent)).every(a=>a.getAttribute('href')==='/mentors')");
    await clickLink("Find a mentor");await browser("wait","--url","**/mentors");await browser("wait","--text","Catalog mentor 02");
    console.log("Catalog passed: public persisted pagination, policy/visibility, keyboard profile links, account navigation, retry/loading, responsive light/dark evidence.");
  } catch(error){throw new Error(`Catalog ${stage}: ${error instanceof Error?error.message:'failure'}`);}
  finally {
    try {for(const statement of ["delete from auth_sessions where user_id=any($1::uuid[])","delete from credentials where user_id=any($1::uuid[])","delete from slots where mentor_profile_id=any($1::uuid[])","delete from mentor_profiles where user_id=any($1::uuid[])","delete from user_roles where user_id=any($1::uuid[])","delete from users where id=any($1::uuid[])"])await client.query(statement,[ids]);}finally{await client.end();}
  }
}
