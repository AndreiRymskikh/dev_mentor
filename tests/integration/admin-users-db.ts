import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { AdminUsersRepository, createDatabaseRuntime, User, UserRole } from "../../packages/db/src";
export async function testAdminUsersDatabase(runtime:ReturnType<typeof createDatabaseRuntime>) {
 const ids=[randomUUID(),randomUUID(),randomUUID()].sort(),now=new Date(),marker=`list-${randomUUID()}`;
 try {
  await runtime.transaction(async em=>{for(const [index,id] of ids.entries()){em.create(User,{id,normalizedEmail:`${marker}-${index}@example.test`,displayName:`${marker} ${index===1?"%_":"person"}`,emailVerifiedAt:index===2?null:now,createdAt:now,updatedAt:now});em.create(UserRole,{userId:id,role:"developer"});}em.create(UserRole,{userId:ids[0],role:"administrator"});await em.flush();});
  const repo=new AdminUsersRepository(runtime);
  assert.equal(await repo.list(ids[1],{page:1,pageSize:20,q:marker}),null);
  assert.equal(await repo.list(ids[2],{page:1,pageSize:20,q:marker}),null);
  const pages=[];for(const page of [1,2,3]){const result=await repo.list(ids[0],{page,pageSize:1,q:marker});assert.ok(result);assert.equal(result.total,3);pages.push(result.items[0].id);assert.deepEqual(Object.keys(result.items[0]).sort(),["id","displayName","email","emailVerifiedAt","roles","createdAt"].sort());}assert.deepEqual(pages,ids);
  for(const q of ["%_",`${marker} %_`]){const result=await repo.list(ids[0],{page:1,pageSize:20,q});assert.equal(result?.total,1);assert.equal(result?.items[0].id,ids[1]);}
  assert.equal((await repo.list(ids[0],{page:1,pageSize:20,q:`${marker}-2@example.test`}))?.items[0].emailVerifiedAt,null);
  for(const query of [{page:4,pageSize:1,q:marker},{page:1,pageSize:20,q:"missing-"+marker}])assert.deepEqual((await repo.list(ids[0],query))?.items,[]);
  assert.ok((await repo.list(ids[0],{page:1,pageSize:100,q:""}))!.total>=3);
  console.log("Admin DB passed: actual parameterized literal search, stable UUID ties, bounded DTO projection and persisted authorization.");
 } finally {await runtime.transaction(async em=>{await em.execute("delete from user_roles where user_id in (?, ?, ?)",ids);await em.execute("delete from users where id in (?, ?, ?)",ids);});}
}
