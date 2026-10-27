import "../../mentor.css";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { withScope } from "@devmentor/core/container";
import { StackTags } from "@devmentor/core/validators/mentors";
import { ErrorMessage } from "@devmentor/ui/backend/feedback";
import { readSessionCookie } from "../../../auth/session-cookie";
import { ProfileEditor } from "./profile-editor";
export const dynamic="force-dynamic";
export const metadata={title:"Your mentor profile | DevMentor",robots:{index:false,follow:false}};
export default async function MentorProfilePage() {
  const requestHeaders=await headers();
  const principal=await withScope(({sessionService})=>sessionService.resolve(readSessionCookie({headers:requestHeaders})));
  if(!principal)redirect("/login");
  if(!principal.roles.includes("mentor"))return <ErrorMessage message="Mentor access is required."/>;
  return <main className="dm-mentor mx-auto grid max-w-3xl gap-group"><ProfileEditor options={StackTags.options} origin={process.env.APP_ORIGIN?new URL(process.env.APP_ORIGIN).origin:""}/></main>;
}
