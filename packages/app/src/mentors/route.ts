import { withScope } from "@devmentor/core/container";
import type { Cradle } from "@devmentor/core/container";
import type { Session } from "@devmentor/core/http";
import { ownedAction, UnauthorizedError, readJsonBody, ValidationError } from "@devmentor/core/http";
import { readSessionCookie } from "../auth/session-cookie";
export async function authorizeMentorSession(service:Cradle["sessionService"],request:Request):Promise<Session> {const principal=await service.resolve(readSessionCookie(request));if(!principal)throw new UnauthorizedError();return {userId:principal.id,roles:principal.roles};}
export function mentorAction<T>(action:(service:Cradle["mentorProfileService"],id:string,request:Request)=>Promise<T>) {
  return (request:Request)=>withScope(({sessionService,mentorProfileService})=>ownedAction({
    authorize:request=>authorizeMentorSession(sessionService,request),
    role:"mentor",mutate:true,trustedOrigin:process.env.APP_ORIGIN,
    action:async(session,request)=>{const input=await readJsonBody(request,4096,true);if(!input||typeof input!=="object"||Array.isArray(input)||Object.keys(input).length)throw new ValidationError();return action(mentorProfileService,session.userId,request);},
  })(request));
}
