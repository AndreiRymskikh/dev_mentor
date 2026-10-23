import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Client } from "pg";
import { SessionJwt } from "../../packages/core/src/services/sessions/jwt";
import { integrationConfig as config } from "./config";
export async function testAdminUsers(baseUrl:string,databaseUrl:string,jwtSecret:string,origin:string) {
 const client=new Client({connectionString:databaseUrl});await client.connect();
 const ids=[randomUUID(),randomUUID(),randomUUID()].sort();
 try {
  const stamp=new Date("2026-01-01T00:00:00Z"), marker=`admin-${randomUUID()}`;
  for(const [index,id] of ids.entries()){
   await client.query("insert into users(id,normalized_email,display_name,email_verified_at,created_at,updated_at) values($1,$2,$3,$4,$4,$4)",[id,`${marker}-${index}@example.test`,`${marker} ${index===1?"%_":"person"}`,stamp]);
   await client.query("insert into user_roles(user_id,role) values($1,'developer')",[id]);
  }
  await client.query("insert into user_roles(user_id,role) values($1,'administrator')",[ids[0]]);
  const jwt=new SessionJwt(()=>jwtSecret);
  async function cookie(id:string){const sid=randomUUID();await client.query("insert into auth_sessions(id,user_id,expires_at) values($1,$2,$3)",[sid,id,new Date(Date.now()+86400000)]);return `__Host-devmentor-session=${await jwt.sign(id,sid,Math.floor(Date.now()/1000))}`;}
  const admin=await cookie(ids[0]),developer=await cookie(ids[1]);
  const request=(path:string,cookie?:string,body?:unknown,csrf="1")=>fetch(baseUrl+path,{method:body===undefined?"GET":"PUT",headers:{...(cookie?{cookie}:{}),"content-type":"application/json","X-DevMentor-CSRF":csrf,origin},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(config.authRequestTimeoutMs)});
  assert.equal((await request("/api/admin/users?page=bad")).status,401);assert.equal((await request("/api/admin/users?page=bad",developer)).status,403);
  for(const query of ["page=0","page=10001","pageSize=101","page=1&page=2","actorId="+ids[0],"sort=email","q="+"x".repeat(101)])assert.equal((await request("/api/admin/users?"+query,admin)).status,400);
  const pages=[];
  for(const page of [1,2,3]){const response=await request(`/api/admin/users?q=${marker}&pageSize=1&page=${page}`,admin);assert.equal(response.status,200);assert.equal(response.headers.get("cache-control"),"no-store");const json=await response.json();assert.equal(json.data.total,3);assert.equal(json.data.page,page);assert.equal(json.data.pageSize,1);assert.equal(json.data.items.length,1);assert.deepEqual(Object.keys(json.data.items[0]).sort(),["id","displayName","email","emailVerifiedAt","roles","createdAt"].sort());pages.push(json.data.items[0].id);}
  assert.deepEqual(pages,ids);
  for(const q of [encodeURIComponent(marker+" %_"),encodeURIComponent("%_")]){const response=await request(`/api/admin/users?q=${q}`,admin);const json=await response.json();assert.equal(json.data.total,1);assert.equal(json.data.items[0].id,ids[1]);}
  for(const suffix of [`q=${marker}&page=4&pageSize=1`,`q=absent-${randomUUID()}`]){const json=await(await request("/api/admin/users?"+suffix,admin)).json();assert.deepEqual(json.data.items,[]);}
  const roles=`/api/admin/users/${ids[1]}/roles`,desired={mentor:true,administrator:true};
  assert.equal((await request(roles,undefined,desired)).status,401);assert.equal((await request(roles,developer,{...desired,userId:ids[0]})).status,403);assert.equal((await request(roles,admin,desired,"0")).status,403);
  for(const body of [{...desired,userId:ids[0]},{...desired,developer:false},{mentor:true}])assert.equal((await request(roles,admin,body)).status,400);
  assert.equal((await request("/api/admin/users/not-a-uuid/roles",admin,desired)).status,400);
  const granted=await request(roles,admin,desired);assert.equal(granted.status,200);assert.equal(granted.headers.get("cache-control"),"no-store");assert.equal((await request("/api/admin/users",developer)).status,200,"current persisted grant appears in existing session");
  assert.equal((await request(roles,admin,{mentor:false,administrator:false})).status,200);assert.equal((await request("/api/admin/users",developer)).status,403,"current revocation immediately denies old cookie");
  assert.equal((await request(`/api/admin/users/${ids[0]}/roles`,admin,{mentor:false,administrator:false})).status,409);
  console.log("Admin HTTP passed: bounded literal stable paging, safe DTO, current authorization, strict mutation/CSRF and last-admin protection.");
 } finally {
  try {await client.query("delete from auth_sessions where user_id=any($1::uuid[])",[ids]);await client.query("delete from user_roles where user_id=any($1::uuid[])",[ids]);await client.query("delete from users where id=any($1::uuid[])",[ids]);} finally {await client.end();}
 }
}
