import { apiHandler } from "@devmentor/core/http";
import { withScope } from "@devmentor/core/container";
import { bookingQuery } from "../../../../../bookings/route";
export const dynamic = "force-dynamic";
export function GET(request:Request,context:{params:Promise<{slug:string}>}) {return apiHandler(()=>withScope(async({bookingService})=>bookingService.options((await context.params).slug,bookingQuery(request))),{noStore:true})(request);}
