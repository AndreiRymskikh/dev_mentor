import {test,expect,vi} from "vitest";
import {randomUUID} from "node:crypto";
import {createAppContainer} from "@devmentor/core/container";
import {ownedAction,makeOwnedResourceRoute,UnauthorizedError} from "@devmentor/core/http";
import {SessionService} from "../packages/core/src/services/users/session.service";
import {MentorProfileService,toOwnerDto,toPublicDto} from "../packages/core/src/services/mentors/mentor-profile.service";
import {GET,PUT,dynamic} from "../packages/app/src/app/api/mentors/me/route";
import {POST as publish} from "../packages/app/src/app/api/mentors/me/publish/route";
import {POST as unpublish} from "../packages/app/src/app/api/mentors/me/unpublish/route";
import {GET as publicRead} from "../packages/app/src/app/api/mentors/[slug]/route";
const id=randomUUID(),profile={userId:id,displayName:"Mentor",publicWorkUrl:"https://example.test",bio:"Bio",stackTags:["react"],slug:"mentor-1",publishedAt:new Date()};
const request=(method="GET",body?:string,csrf="1")=>new Request("http://localhost/api/mentors/me",{method,headers:{"Content-Type":"application/json","X-DevMentor-CSRF":csrf},...(body===undefined?{}:{body})});
test("owned callbacks authorize before mutations, apply optional roles/CSRF and preserve envelopes",async()=>{
 const authorize=vi.fn(async()=>({userId:id,roles:["mentor"] as const})),action=vi.fn(async()=>({owned:true}));const route=ownedAction({authorize,action});expect((await route(request())).status).toBe(200);expect(action).toHaveBeenCalledWith({userId:id,roles:["mentor"]},expect.any(Request));
 const guarded=ownedAction({authorize,action,role:"administrator",mutate:true});expect((await guarded(request("POST","{}"))).status).toBe(403);
 const resource=makeOwnedResourceRoute({authorize,read:async session=>({id:session.userId}),update:async session=>({id:session.userId}),role:"mentor"});expect((await resource.GET(request())).status).toBe(200);expect((await resource.PUT(request("PUT","{}","0"))).status).toBe(403);expect((await resource.PUT(request("PUT","{}"))).headers.get("cache-control")).toBe("no-store");
 authorize.mockRejectedValueOnce(new UnauthorizedError());expect((await route(request())).status).toBe(401);
});
test("mentor API enforces current role, bounded strict bodies and service-owned identity",async()=>{
 const resolve=vi.spyOn(SessionService.prototype,"resolve").mockResolvedValue(null),get=vi.spyOn(MentorProfileService.prototype,"getMine").mockResolvedValue(toOwnerDto(profile)),update=vi.spyOn(MentorProfileService.prototype,"update").mockResolvedValue(toOwnerDto(profile));
 expect(dynamic).toBe("force-dynamic");expect((await GET(request())).status).toBe(401);expect((await PUT(request("PUT","{"))).status).toBe(401);expect(get).not.toHaveBeenCalled();
 resolve.mockResolvedValue({id,displayName:"Mentor",roles:["developer"]});expect((await GET(request())).status).toBe(403);
 resolve.mockResolvedValue({id,displayName:"Mentor",roles:["developer","mentor"]});expect((await GET(request())).status).toBe(200);expect(get).toHaveBeenCalledWith(id);
 expect((await PUT(request("PUT","{}","0"))).status).toBe(403);expect((await PUT(request("PUT","{"))).status).toBe(400);expect((await PUT(request("PUT",JSON.stringify({bio:"New"})))).status).toBe(200);expect(update).toHaveBeenCalledWith(id,{bio:"New"});
 const publishCall=vi.spyOn(MentorProfileService.prototype,"publish").mockResolvedValue(toOwnerDto(profile)),unpublishCall=vi.spyOn(MentorProfileService.prototype,"unpublish").mockResolvedValue(toOwnerDto({...profile,publishedAt:null}));
 for(const body of ["null","[]",'"bad"','{"userId":"other"}'])expect((await publish(request("POST",body))).status).toBe(400);
 expect((await publish(request("POST","{}"))).status).toBe(200);expect(publishCall).toHaveBeenCalledWith(id);expect((await unpublish(request("POST","{}"))).status).toBe(200);expect(unpublishCall).toHaveBeenCalledWith(id);
 const publicCall=vi.spyOn(MentorProfileService.prototype,"getPublicBySlug").mockResolvedValue(toPublicDto(profile));const publicResponse=await publicRead(request(),{params:Promise.resolve({slug:"mentor-1"})});expect(publicResponse.status).toBe(200);expect(publicCall).toHaveBeenCalledWith("mentor-1");expect(publicResponse.headers.get("cache-control")).toBe("no-store");
 const container=createAppContainer(),a=container.createScope(),b=container.createScope();expect(a.cradle.mentorProfileService).not.toBe(b.cradle.mentorProfileService);expect(a.cradle.mentorProfileRepository).not.toBe(b.cradle.mentorProfileRepository);await a.dispose();await b.dispose();await container.dispose();
});
test("profile DI emits a fixed audit marker after a committed first publication",async()=>{
 const {asValue}=await import("awilix");const container=createAppContainer(),scope=container.createScope();scope.register({mentorProfileRepository:asValue({mutate:async(_id:string,work:(value:typeof profile)=>void)=>{const value={...profile,slug:null as string|null,publishedAt:null as Date|null};work(value as typeof profile);return value;}})});const info=vi.spyOn(scope.cradle.logger,"info").mockImplementation(()=>{});
 try{await scope.cradle.mentorProfileService.publish(id);expect(info).toHaveBeenCalledWith({event:"mentors.profile.published"},"Mentor profile published");}finally{await scope.dispose();await container.dispose();}
});
