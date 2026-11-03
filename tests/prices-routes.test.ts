import {test,expect,vi} from "vitest";
import {randomUUID} from "node:crypto";
import {createAppContainer} from "@devmentor/core/container";
import {SessionService} from "../packages/core/src/services/users/session.service";
import {MentorPricesService} from "../packages/core/src/services/prices/mentor-prices.service";
import {GET,PUT,dynamic} from "../packages/app/src/app/api/mentors/me/prices/route";
import {GET as publicGet,dynamic as publicDynamic} from "../packages/app/src/app/api/mentors/[slug]/offer/route";
const actor=randomUUID(),req=(method="GET",body?:string,csrf="1")=>new Request("https://site.test/api/mentors/me/prices",{method,headers:{"Content-Type":"application/json","X-DevMentor-CSRF":csrf},...(body===undefined?{}:{body})});
test("prices routes authorize before input, bind current owner, protect mutation and use no-store envelopes",async()=>{
 const resolve=vi.spyOn(SessionService.prototype,"resolve").mockResolvedValue(null),read=vi.spyOn(MentorPricesService.prototype,"getMine").mockResolvedValue({} as never),save=vi.spyOn(MentorPricesService.prototype,"update").mockResolvedValue({} as never),pub=vi.spyOn(MentorPricesService.prototype,"getPublicBySlug").mockResolvedValue({} as never);
 expect(dynamic).toBe("force-dynamic");expect(publicDynamic).toBe(dynamic);expect((await GET(req())).status).toBe(401);expect((await PUT(req("PUT","{"))).status).toBe(401);expect(save).not.toHaveBeenCalled();resolve.mockResolvedValue({id:actor,displayName:"Dev",roles:["developer"]});expect((await GET(req())).status).toBe(403);expect((await PUT(req("PUT","{}"))).status).toBe(403);
 resolve.mockResolvedValue({id:actor,displayName:"Mentor",roles:["mentor"]});const response=await GET(req());expect(response.headers.get("cache-control")).toBe("no-store");expect(read).toHaveBeenCalledWith(actor);expect((await PUT(req("PUT","{}","0"))).status).toBe(403);expect((await PUT(req("PUT","{"))).status).toBe(400);expect((await PUT(req("PUT",JSON.stringify("x".repeat(1025))))).status).toBe(400);
 const input={price25:"90.00",price50:"180.00"};expect((await PUT(req("PUT",JSON.stringify(input)))).status).toBe(200);expect(save).toHaveBeenCalledWith(actor,input);
 resolve.mockResolvedValue(null);const publicResponse=await publicGet(req(),{params:Promise.resolve({slug:"mentor"})});expect(publicResponse.headers.get("cache-control")).toBe("no-store");expect(pub).toHaveBeenCalledWith("mentor");
 const container=createAppContainer(),a=container.createScope(),b=container.createScope();expect(a.cradle.mentorPricesService).not.toBe(b.cradle.mentorPricesService);expect(a.cradle.mentorPricesRepository).not.toBe(b.cradle.mentorPricesRepository);await a.dispose();await b.dispose();await container.dispose();
});
