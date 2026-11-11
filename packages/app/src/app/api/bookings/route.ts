import { bookingRoute, bookingBody, bookingQuery } from "../../../bookings/route";
export const dynamic = "force-dynamic";
export const GET=bookingRoute((service,actor,request)=>service.list(actor,bookingQuery(request)));
export const POST=bookingRoute(async(service,actor,request)=>service.create(actor,await bookingBody(request)),{mutate:true,create:true});
