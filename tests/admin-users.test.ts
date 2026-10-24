import { test, expect, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { AdminUsersRepository, createDatabaseRuntime, User, UserRole } from "@devmentor/db";
import { AdminUsersService } from "../packages/core/src/services/users/admin-users.service";
import { SessionService } from "../packages/core/src/services/users/session.service";
import { RolesService } from "../packages/core/src/services/users/roles.service";
import { createAppContainer } from "@devmentor/core/container";
import { GET, dynamic } from "../packages/app/src/app/api/admin/users/route";
import { PUT, dynamic as mutationDynamic } from "../packages/app/src/app/api/admin/users/[id]/roles/route";
const id=randomUUID(), other=randomUUID();
test("admin listing validates strict bounded query and current actor with safe failures",async()=>{
 const list=vi.fn(),service=new AdminUsersService({list});
 await expect(service.list(null,{})).rejects.toMatchObject({status:401});
 for(const query of [{page:0},{page:10001},{page:1.5},{pageSize:101},{pageSize:0},{q:"a".repeat(101)},{sort:"email"},{roles:[]}])await expect(service.list(id,query)).rejects.toMatchObject({status:400});
 list.mockResolvedValueOnce(null);await expect(service.list(id,{})).rejects.toMatchObject({status:403});
 list.mockRejectedValueOnce(new Error("private"));await expect(service.list(id,{})).rejects.toMatchObject({status:503});
 const page={items:[],page:1,pageSize:20,total:0};list.mockResolvedValue(page);expect(await service.list(id.toUpperCase(),{})).toEqual(page);expect(list).toHaveBeenLastCalledWith(id,{page:1,pageSize:20,q:""});await service.list(id,{page:"2",pageSize:"100",q:" Name%_ "});expect(list).toHaveBeenLastCalledWith(id,{page:2,pageSize:100,q:"name%_"});
});
test("admin repository locks and rechecks verified membership and projects only safe deterministic DTOs",async()=>{
 const runtime=createDatabaseRuntime(),findOne=vi.fn(),findAndCount=vi.fn(),find=vi.fn();vi.spyOn(runtime,"transaction").mockImplementation(async run=>run({findOne,findAndCount,find} as never));const repository=new AdminUsersRepository(runtime),now=new Date();
 findOne.mockResolvedValueOnce(null);expect(await repository.list(id,{page:1,pageSize:20,q:""})).toBe(null);
 findOne.mockResolvedValueOnce({emailVerifiedAt:null});expect(await repository.list(id,{page:1,pageSize:20,q:""})).toBe(null);
 findOne.mockResolvedValueOnce({emailVerifiedAt:now}).mockResolvedValueOnce(null);expect(await repository.list(id,{page:1,pageSize:20,q:""})).toBe(null);
 findOne.mockImplementation(async entity=>entity===User?{emailVerifiedAt:now}:{role:"administrator"});
 const user={id,displayName:"Name",normalizedEmail:"name@example.test",emailVerifiedAt:now,createdAt:now,passwordHash:"secret"};findAndCount.mockResolvedValue([[user,{...user,id:other,emailVerifiedAt:null}],2]);find.mockResolvedValue([{userId:id,role:"developer"},{userId:id,role:"administrator"},{userId:other,role:"developer"}]);
 expect(await repository.list(id,{page:2,pageSize:1,q:"%_"})).toEqual({items:[{id,displayName:"Name",email:"name@example.test",emailVerifiedAt:now.toISOString(),createdAt:now.toISOString(),roles:["developer","administrator"]},{id:other,displayName:"Name",email:"name@example.test",emailVerifiedAt:null,createdAt:now.toISOString(),roles:["developer"]}],page:2,pageSize:1,total:2});expect(findAndCount).toHaveBeenLastCalledWith(User,expect.objectContaining({$or:expect.any(Array)}),{orderBy:{createdAt:"asc",id:"asc"},limit:1,offset:1});expect(find).toHaveBeenCalledWith(UserRole,{userId:{$in:[id,other]}},{orderBy:{role:"asc"}});
 findAndCount.mockResolvedValue([[],0]);expect(await repository.list(id,{page:1,pageSize:20,q:""})).toEqual({items:[],page:1,pageSize:20,total:0});expect(findAndCount).toHaveBeenLastCalledWith(User,{},expect.objectContaining({offset:0}));expect(findOne).toHaveBeenCalledWith(User,{id},{lockMode:expect.anything()});
});
test("admin routes authenticate and authorize before query, context or body and use explicit safe contracts",async()=>{
 const resolve=vi.spyOn(SessionService.prototype,"resolve").mockResolvedValue(null),list=vi.spyOn(AdminUsersService.prototype,"list").mockResolvedValue({items:[],page:1,pageSize:20,total:0}),set=vi.spyOn(RolesService.prototype,"setRoles").mockResolvedValue({roles:["developer"]});
 const request=(query="",body="{}",csrf="1")=>new Request("http://localhost/api/admin/users"+query,{method:"PUT",headers:{"content-type":"application/json","X-DevMentor-CSRF":csrf},body});let accessed=false;const context={get params(){accessed=true;return Promise.resolve({id:other});}};
 expect(dynamic).toBe("force-dynamic");expect(mutationDynamic).toBe("force-dynamic");
 expect((await GET(request("?page=bad"))).status).toBe(401);expect((await PUT(request("","{"),context)).status).toBe(401);expect(accessed).toBe(false);
 resolve.mockResolvedValue({id,displayName:"Name",roles:["developer"]});expect((await GET(request("?page=bad"))).status).toBe(403);expect((await PUT(request(),context)).status).toBe(403);expect(accessed).toBe(false);expect(list).not.toHaveBeenCalled();expect(set).not.toHaveBeenCalled();
 resolve.mockResolvedValue({id,displayName:"Name",roles:["developer","administrator"]});expect((await PUT(request("","{}","0"),context)).status).toBe(403);expect(accessed).toBe(false);
 expect((await GET(request("?page=1&page=2"))).status).toBe(400);expect(list).not.toHaveBeenCalled();const response=await GET(request("?page=2&q=name"));expect(response.status).toBe(200);expect(response.headers.get("cache-control")).toBe("no-store");expect(list).toHaveBeenCalledWith(id,{page:"2",q:"name"});expect(await response.json()).toEqual({ok:true,data:{items:[],page:1,pageSize:20,total:0}});
 const mutation=await PUT(request("",JSON.stringify({mentor:false,administrator:false})),context);expect(mutation.status).toBe(200);expect(mutation.headers.get("cache-control")).toBe("no-store");expect(set).toHaveBeenCalledWith(id,other,{mentor:false,administrator:false});expect(await mutation.json()).toEqual({ok:true,data:{roles:["developer"]}});
 const container=createAppContainer(),a=container.createScope(),b=container.createScope();expect(a.cradle.adminUsersRepository).not.toBe(b.cradle.adminUsersRepository);expect(a.cradle.adminUsersService).not.toBe(b.cradle.adminUsersService);await a.dispose();await b.dispose();await container.dispose();
});
