import {test,expect,vi} from "vitest";
import {randomUUID} from "node:crypto";
import {detailsDto} from "@devmentor/db";
import {createAppContainer} from "@devmentor/core/container";
import {SessionService} from "../packages/core/src/services/users/session.service";
import {MentorDetailsService} from "../packages/core/src/services/mentors/mentor-details.service";
import {GET,PUT,dynamic} from "../packages/app/src/app/api/mentors/me/details/route";
import {GET as publicRead,dynamic as publicDynamic} from "../packages/app/src/app/api/mentors/[slug]/details/route";
const id=randomUUID(),empty=detailsDto({}),request=(method="GET",body?:string,csrf="1")=>new Request("https://site.test/api/mentors/me/details",{method,headers:{"Content-Type":"application/json","X-DevMentor-CSRF":csrf},...(body===undefined?{}:{body})});
test("details routes authorize before reading bodies, bound writes, enforce CSRF, use session ownership and no-store",async()=>{
 const resolve=vi.spyOn(SessionService.prototype,"resolve").mockResolvedValue(null),read=vi.spyOn(MentorDetailsService.prototype,"getMine").mockResolvedValue(empty),update=vi.spyOn(MentorDetailsService.prototype,"update").mockResolvedValue(empty);
 expect(dynamic).toBe("force-dynamic");expect(publicDynamic).toBe(dynamic);expect((await GET(request())).status).toBe(401);expect((await PUT(request("PUT","{"))).status).toBe(401);expect(read).not.toHaveBeenCalled();resolve.mockResolvedValue({id,displayName:"Mentor",roles:["developer"]});expect((await GET(request())).status).toBe(403);
 resolve.mockResolvedValue({id,displayName:"Mentor",roles:["mentor"]});expect((await GET(request())).headers.get("cache-control")).toBe("no-store");expect(read).toHaveBeenCalledWith(id);
 expect((await PUT(request("PUT","{}","0"))).status).toBe(403);expect((await PUT(request("PUT","{"))).status).toBe(400);expect((await PUT(request("PUT",'"'+"x".repeat(32768)+'"'))).status).toBe(400);expect((await PUT(request("PUT",'{"helpTopics":[]}'))).status).toBe(200);expect(update).toHaveBeenCalledWith(id,{helpTopics:[]});
 const publicGet=vi.spyOn(MentorDetailsService.prototype,"getPublicBySlug").mockResolvedValue(empty);const result=await publicRead(request(),{params:Promise.resolve({slug:"mentor"})});expect(result.status).toBe(200);expect(result.headers.get("cache-control")).toBe("no-store");expect(publicGet).toHaveBeenCalledWith("mentor");
 const container=createAppContainer(),a=container.createScope(),b=container.createScope();expect(a.cradle.mentorDetailsService).not.toBe(b.cradle.mentorDetailsService);expect(a.cradle.mentorDetailsRepository).not.toBe(b.cradle.mentorDetailsRepository);await a.dispose();await b.dispose();await container.dispose();
});
