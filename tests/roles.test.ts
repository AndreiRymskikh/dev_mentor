import { test, expect, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { RolesRepository, ADMIN_MEMBERSHIP_LOCK, createDatabaseRuntime, User, UserRole } from "@devmentor/db";
import { RolesService } from "../packages/core/src/services/users/roles.service";
import { bootstrapAdmin } from "../packages/core/src/operators/bootstrap-admin";
import { AppError } from "@devmentor/core/http";
import { SessionService } from "../packages/core/src/services/users/session.service";
import { createAppContainer } from "@devmentor/core/container";
import { POST, dynamic } from "../packages/app/src/app/api/users/me/mentor/route";
const actorId = randomUUID(), targetId = randomUUID();
test("role service validates all explicit inputs and maps transactional outcomes safely", async () => {
  const repository = { enrollMentor: vi.fn(), setRoles: vi.fn(), bootstrap: vi.fn() }; const service = new RolesService(repository);
  for (const invoke of [() => service.enrollMentor(null,{}), () => service.setRoles("forged",targetId,{})]) await expect(invoke()).rejects.toMatchObject({status:401});
  for (const invoke of [() => service.enrollMentor(actorId,{role:"administrator"}),() => service.setRoles(actorId,"bad",{mentor:true,administrator:false}), () => service.setRoles(actorId,targetId,{mentor:true,administrator:false,developer:false}),() => service.setRoles(actorId,targetId,{mentor:true}),() => service.bootstrap("bad")]) await expect(invoke()).rejects.toMatchObject({status:400});
  for (const [status, code] of [["forbidden",403],["not-found",404],["conflict",409]] as const) { repository.enrollMentor.mockResolvedValueOnce({status}); await expect(service.enrollMentor(actorId,{})).rejects.toMatchObject({status:code}); }
  repository.enrollMentor.mockRejectedValueOnce(new Error("private")); await expect(service.enrollMentor(actorId,{})).rejects.toMatchObject({status:503});
  repository.enrollMentor.mockResolvedValueOnce({status:"ok",roles:["developer","mentor"]}); expect(await service.enrollMentor(actorId,{})).toEqual({roles:["developer","mentor"]});
  repository.setRoles.mockResolvedValueOnce({status:"ok",roles:["developer"]}); expect(await service.setRoles(actorId.toUpperCase(),targetId.toUpperCase(),{mentor:false,administrator:false})).toEqual({roles:["developer"]}); expect(repository.setRoles).toHaveBeenCalledWith(actorId,targetId,{mentor:false,administrator:false});
  repository.bootstrap.mockResolvedValueOnce({status:"ok",roles:["developer","administrator"]}); expect(await service.bootstrap(actorId.toUpperCase())).toEqual({roles:["developer","administrator"]});
});
test("roles persistence locks users, serializes all admin writers and preserves baseline", async () => {
  const runtime=createDatabaseRuntime(); const findOne=vi.fn(),find=vi.fn(),execute=vi.fn().mockResolvedValue([{count:2}]),upsert=vi.fn(),nativeDelete=vi.fn(),count=vi.fn().mockResolvedValue(2);
  const em={findOne,find,execute,upsert,nativeDelete,count};vi.spyOn(runtime,"transaction").mockImplementation(async work=>work(em as never));const repo=new RolesRepository(runtime);
  const actor={id:actorId,emailVerifiedAt:new Date()},target={id:targetId,emailVerifiedAt:new Date()};const roles=[{role:"developer"},{role:"mentor"}];
  let users: {id:string;emailVerifiedAt:Date|null}[]=[actor,target], admin=true, baseline=true, wasAdmin=true; let existing: {userId:string}[]=[];
  findOne.mockImplementation(async(entity,query)=>entity===User?users.find(user=>user.id===query.id)??null:query.role==="developer"?(baseline?{role:"developer"}:null):query.userId===actorId?(admin?{role:"administrator"}:null):(wasAdmin?{role:"administrator"}:null));
  find.mockImplementation(async(entity,query)=>entity===User?users:query.userId?roles:existing);
  for (const collection of [[],[{...actor,emailVerifiedAt:null}]]) {users=collection as typeof users;expect(await repo.enrollMentor(actorId)).toEqual({status:"forbidden"});}
  users=[actor,target];baseline=false;expect(await repo.enrollMentor(actorId)).toEqual({status:"forbidden"});baseline=true;expect(await repo.enrollMentor(actorId)).toEqual({status:"ok",roles:["developer","mentor"]});expect(upsert).toHaveBeenCalledWith(UserRole,{userId:actorId,role:"mentor"});
  for (const collection of [[],[{...actor,emailVerifiedAt:null}]]) {users=collection as typeof users;expect(await repo.setRoles(actorId,targetId,{mentor:false,administrator:false})).toEqual({status:"forbidden"});}
  users=[actor,target];admin=false;expect(await repo.setRoles(actorId,targetId,{mentor:false,administrator:false})).toEqual({status:"forbidden"});admin=true;users=[actor];expect(await repo.setRoles(actorId,targetId,{mentor:false,administrator:false})).toEqual({status:"not-found"});users=[actor,target];baseline=false;expect(await repo.setRoles(actorId,targetId,{mentor:false,administrator:false})).toEqual({status:"forbidden"});baseline=true;
  execute.mockResolvedValueOnce(undefined).mockResolvedValueOnce([{count:1}]);expect(await repo.setRoles(actorId,targetId,{mentor:false,administrator:false})).toEqual({status:"conflict"});
  // An unverified membership cannot replace the last usable administrator.
  expect(execute).toHaveBeenCalledWith(expect.stringContaining("u.email_verified_at is not null"),["administrator"]);
  for (const desired of [{mentor:false,administrator:false},{mentor:true,administrator:true}]) expect(await repo.setRoles(actorId,targetId,desired)).toEqual({status:"ok",roles:["developer","mentor"]});
  wasAdmin=false;expect((await repo.setRoles(actorId,targetId,{mentor:true,administrator:false})).status).toBe("ok");wasAdmin=true;users=[actor,{...target,emailVerifiedAt:null}] as typeof users;expect((await repo.setRoles(actorId,targetId,{mentor:false,administrator:false})).status).toBe("ok");
  expect(nativeDelete.mock.calls.every(call=>call[1].role!=="developer")).toBe(true);expect(execute).toHaveBeenCalledWith("select pg_advisory_xact_lock(?)",[ADMIN_MEMBERSHIP_LOCK]);expect(find).toHaveBeenCalledWith(User,{id:{$in:[actorId,targetId]}},{orderBy:{id:"asc"},lockMode:expect.anything()});
  users=[];expect(await repo.bootstrap(actorId)).toEqual({status:"not-found"});users=[{...actor,emailVerifiedAt:null}] as typeof users;expect(await repo.bootstrap(actorId)).toEqual({status:"forbidden"});users=[actor];baseline=false;expect(await repo.bootstrap(actorId)).toEqual({status:"forbidden"});baseline=true;
  existing=[{userId:targetId}];expect(await repo.bootstrap(actorId)).toEqual({status:"conflict"});
  for(const memberships of [[],[{userId:actorId}]]){existing=memberships;expect(await repo.bootstrap(actorId)).toEqual({status:"ok",roles:["developer","mentor"]});}
});
test("bootstrap operator validates argument count and emits only fixed safe outcomes", async()=>{
  const output=vi.fn(),bootstrap=vi.fn();for(const args of [[],[actorId,targetId]])expect(await bootstrapAdmin(args,{bootstrap},output)).toBe(1);expect(bootstrap).not.toHaveBeenCalled();
  bootstrap.mockResolvedValueOnce({roles:[]});expect(await bootstrapAdmin([actorId],{bootstrap},output)).toBe(0);expect(bootstrap).toHaveBeenCalledWith(actorId);expect(output).toHaveBeenLastCalledWith("Administrator membership confirmed.");
  bootstrap.mockRejectedValueOnce(new AppError("FORBIDDEN","Forbidden",403));expect(await bootstrapAdmin([actorId],{bootstrap},output)).toBe(1);expect(output).toHaveBeenLastCalledWith("Forbidden");bootstrap.mockRejectedValueOnce(new Error("private"));expect(await bootstrapAdmin([actorId],{bootstrap},output)).toBe(1);expect(output).toHaveBeenLastCalledWith("Service temporarily unavailable");
});
test("mentor route authenticates before reading body, rejects CSRF, disposes scoped DI",async()=>{
  const resolve=vi.spyOn(SessionService.prototype,"resolve").mockResolvedValue(null),enroll=vi.spyOn(RolesService.prototype,"enrollMentor").mockResolvedValue({roles:["developer","mentor"]});const request=(body="{}",csrf="1")=>new Request("http://localhost/api/users/me/mentor",{method:"POST",headers:{"content-type":"application/json","X-DevMentor-CSRF":csrf},body});
  expect(dynamic).toBe("force-dynamic");expect((await POST(request("{"))).status).toBe(401);expect(enroll).not.toHaveBeenCalled();resolve.mockResolvedValue({id:actorId,displayName:"Name",roles:["developer"]});expect((await POST(request("{}","0"))).status).toBe(403);const response=await POST(request());expect(response.status).toBe(200);expect(response.headers.get("cache-control")).toBe("no-store");expect(await response.json()).toEqual({ok:true,data:{roles:["developer","mentor"]}});expect(enroll).toHaveBeenCalledWith(actorId,{});
  const container=createAppContainer(),a=container.createScope(),b=container.createScope();expect(a.cradle.rolesService).not.toBe(b.cradle.rolesService);expect(a.cradle.rolesRepository).not.toBe(b.cradle.rolesRepository);await a.dispose();await b.dispose();await container.dispose();
});
