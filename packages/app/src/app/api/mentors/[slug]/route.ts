import { apiHandler } from "@devmentor/core/http";
import { withScope } from "@devmentor/core/container";
export const dynamic="force-dynamic";
export function GET(request:Request,context:{params:Promise<{slug:string}>}) {return apiHandler(()=>withScope(async({mentorProfileService})=>mentorProfileService.getPublicBySlug((await context.params).slug)),{noStore:true})(request);}
