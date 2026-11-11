import {test,expect,vi} from "vitest";
import {randomUUID} from "node:crypto";
import {createAppContainer} from "@devmentor/core/container";
import {SessionService} from "../packages/core/src/services/users/session.service";
import {BookingService} from "../packages/core/src/services/bookings/booking.service";
import * as list from "../packages/app/src/app/api/bookings/route";
import * as detail from "../packages/app/src/app/api/bookings/[id]/route";
import * as cancel from "../packages/app/src/app/api/bookings/[id]/cancel/route";
import * as complete from "../packages/app/src/app/api/bookings/[id]/complete/route";
import * as reschedule from "../packages/app/src/app/api/bookings/[id]/reschedule/route";
import * as admin from "../packages/app/src/app/api/admin/bookings/[id]/route";
import * as options from "../packages/app/src/app/api/mentors/[slug]/booking-options/route";
const actor=randomUUID(),id=randomUUID(),ctx={params:Promise.resolve({id})},request=(path="",method="GET",body?:string,csrf="1")=>new Request("https://site.test/api/bookings"+path,{method,headers:{"Content-Type":"application/json","X-DevMentor-CSRF":csrf},...(body===undefined?{}:{body})});
test("booking routes authenticate before data/body and protect every mutation with CSRF",async()=>{
 const resolve=vi.spyOn(SessionService.prototype,"resolve").mockResolvedValue(null),create=vi.spyOn(BookingService.prototype,"create").mockResolvedValue({replayed:false} as never),read=vi.spyOn(BookingService.prototype,"read").mockResolvedValue({} as never),change=vi.spyOn(BookingService.prototype,"change").mockResolvedValue({} as never),listing=vi.spyOn(BookingService.prototype,"list").mockResolvedValue({} as never),publicRead=vi.spyOn(BookingService.prototype,"options").mockResolvedValue({} as never);
 for(const route of [list,detail,cancel,complete,reschedule,admin,options])expect(route.dynamic).toBe("force-dynamic");
 expect((await list.GET(request())).status).toBe(401);expect((await list.POST(request("","POST","{"))).status).toBe(401);expect(create).not.toHaveBeenCalled();
 resolve.mockResolvedValue({id:actor,displayName:"Dev",roles:["developer"]});expect((await admin.GET(request(),ctx)).status).toBe(403);
 expect((await list.POST(request("","POST","{}","0"))).status).toBe(403);expect((await list.POST(request("","POST","{"))).status).toBe(400);expect((await list.POST(request("","POST",JSON.stringify("x".repeat(8193))))).status).toBe(400);
 const created=await list.POST(request("","POST","{}"));expect(created.status).toBe(201);expect(created.headers.get("cache-control")).toBe("no-store");expect(create).toHaveBeenCalledWith(actor,{});
 create.mockResolvedValueOnce({replayed:true} as never);expect((await list.POST(request("","POST","{}"))).status).toBe(200);
 expect((await list.GET(request("?view=history&limit=1"))).status).toBe(200);expect(listing).toHaveBeenCalledWith(actor,{view:"history",limit:"1"});expect((await list.GET(request("?limit=1&limit=2"))).status).toBe(400);
 expect((await detail.GET(request("?after=1"),ctx)).status).toBe(200);expect(read).toHaveBeenCalledWith(actor,id,{after:"1"});
 for(const [route,op]of [[cancel,"cancel"],[complete,"complete"],[reschedule,"reschedule"]] as const){expect((await route.POST(request("","POST","{}"),ctx)).status).toBe(200);expect(change).toHaveBeenLastCalledWith(actor,id,op,{});}
 resolve.mockResolvedValue({id:actor,displayName:"Admin",roles:["administrator"]});expect((await admin.GET(request(),ctx)).status).toBe(200);expect(read).toHaveBeenLastCalledWith(actor,id,{},true);
 resolve.mockResolvedValue(null);const pub=await options.GET(request("?duration=50"),{params:Promise.resolve({slug:"mentor"})});expect(pub.status).toBe(200);expect(pub.headers.get("cache-control")).toBe("no-store");expect(publicRead).toHaveBeenCalledWith("mentor",{duration:"50"});
 const container=createAppContainer(),a=container.createScope(),b=container.createScope();expect(a.cradle.bookingRepository).not.toBe(b.cradle.bookingRepository);expect(a.cradle.bookingService).not.toBe(b.cradle.bookingService);await a.dispose();await b.dispose();await container.dispose();
});
