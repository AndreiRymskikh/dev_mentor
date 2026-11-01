import { readJsonBody, makeOwnedResourceRoute } from "@devmentor/core/http";
import { withScope } from "@devmentor/core/container";
import { authorizeMentorSession } from "../../../../../mentors/route";
export const dynamic="force-dynamic";
function route(method:"GET"|"PUT") {return (request:Request)=>withScope(({sessionService,mentorDetailsService})=>makeOwnedResourceRoute({
  authorize:request=>authorizeMentorSession(sessionService,request),role:"mentor",trustedOrigin:process.env.APP_ORIGIN,
  read:session=>mentorDetailsService.getMine(session.userId),
  update:async(session,request)=>mentorDetailsService.update(session.userId,await readJsonBody(request,32768)),
})[method](request));}
export const GET=route("GET"),PUT=route("PUT");
