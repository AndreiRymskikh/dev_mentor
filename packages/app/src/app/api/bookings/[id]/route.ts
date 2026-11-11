import { bookingRoute, bookingQuery } from "../../../../bookings/route";
export const dynamic = "force-dynamic";
export function GET(request:Request,context:{params:Promise<{id:string}>}) {return bookingRoute(async(service,actor,request)=>service.read(actor,(await context.params).id,bookingQuery(request)))(request);}
