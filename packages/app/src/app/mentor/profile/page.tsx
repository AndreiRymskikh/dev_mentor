import "../../mentor.css";
import "./profile-editor.css";
import "@devmentor/ui/frames.css";
import { Workspace } from "../../workspace";
import { LogoutButton } from "../../(auth)/account/logout-button";
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
  return <Workspace identity={principal.displayName} roles={principal.roles} current="profile" signOut={<LogoutButton/>}><div className="dm-profile-page"><ProfileEditor options={StackTags.options} origin={process.env.APP_ORIGIN?new URL(process.env.APP_ORIGIN).origin:""}/></div></Workspace>;
}
