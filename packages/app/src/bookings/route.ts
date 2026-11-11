import { apiHandler, requireCsrf, requireRole, UnauthorizedError, ValidationError, readJsonBody } from "@devmentor/core/http";
import { withScope, type Cradle } from "@devmentor/core/container";
import { readSessionCookie } from "../auth/session-cookie";
export function bookingQuery(request:Request) {
 const input:Record<string,string>={};for(const [key,value] of new URL(request.url).searchParams){if(Object.hasOwn(input,key))throw new ValidationError();Object.defineProperty(input,key,{value,enumerable:true});}return input;
}
export function bookingRoute<T>(action:(service:Cradle["bookingService"],actor:string,request:Request)=>Promise<T>,options:{mutate?:boolean;admin?:boolean;create?:boolean}={}) {
 return apiHandler(request=>withScope(async({sessionService,bookingService})=>{
  const principal=await sessionService.resolve(readSessionCookie(request));if(!principal)throw new UnauthorizedError();
  if(options.admin)requireRole({userId:principal.id,roles:principal.roles},"administrator");
  if(options.mutate)requireCsrf(request,process.env.APP_ORIGIN);
  return action(bookingService,principal.id,request);
 }),{noStore:true,response:data=>({status:options.create&&data&&typeof data==="object"&&"replayed" in data&&!data.replayed?201:200})});
}
export function bookingBody(request:Request){return readJsonBody(request,8192,true);}
