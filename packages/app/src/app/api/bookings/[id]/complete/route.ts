import { bookingRoute, bookingBody } from "../../../../../bookings/route";
export const dynamic = "force-dynamic";
export function POST(request:Request,context:{params:Promise<{id:string}>}) {return bookingRoute(async(service,actor,request)=>service.change(actor,(await context.params).id,"complete",await bookingBody(request)),{mutate:true})(request);}
