import { mentorAction } from "../../../../../mentors/route";
export const dynamic="force-dynamic";
export const POST=mentorAction((service,id)=>service.publish(id));
