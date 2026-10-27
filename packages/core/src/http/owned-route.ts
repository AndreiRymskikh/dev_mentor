import { apiHandler } from "./apiHandler";
import { requireRole, requireCsrf, type Session, type Role } from "./auth";
export function ownedAction<T>(options:{authorize:(request:Request)=>Promise<Session>;action:(session:Session,request:Request)=>Promise<T>;role?:Role;mutate?:boolean;trustedOrigin?:string}) {
  return apiHandler(async request=>{const session=await options.authorize(request);if(options.role)requireRole(session,options.role);if(options.mutate)requireCsrf(request,options.trustedOrigin);return options.action(session,request);},{noStore:true});
}
export function makeOwnedResourceRoute<T>(options:{authorize:(request:Request)=>Promise<Session>;read:(session:Session)=>Promise<T>;update:(session:Session,request:Request)=>Promise<T>;role:Role;trustedOrigin?:string}) {
  return {GET:ownedAction({...options,action:options.read}),PUT:ownedAction({...options,action:options.update,mutate:true})};
}
