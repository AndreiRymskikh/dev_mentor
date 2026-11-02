import "../../../mentor.css";
import "../profile-editor.css";
import "./details.css";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { withScope } from "@devmentor/core/container";
import { ErrorMessage } from "@devmentor/ui/backend/feedback";
import { readSessionCookie } from "../../../../auth/session-cookie";
import { PublicDetailsEditor } from "./details-editor";
import { Link } from "@devmentor/ui/components/ui/link";
export const dynamic="force-dynamic";
export const metadata={title:"Public profile details | DevMentor",robots:{index:false,follow:false}};
export default async function DetailsPage() {
  const requestHeaders=await headers();
  const principal=await withScope(({sessionService})=>sessionService.resolve(readSessionCookie({headers:requestHeaders})));
  if(!principal)redirect("/login");
  if(!principal.roles.includes("mentor"))return <ErrorMessage message="Mentor access is required."/>;
  return <main className="dm-mentor dm-details-page"><Link href="/mentor/profile">Back to profile editor</Link><h1>Public profile details</h1><PublicDetailsEditor/></main>;
}
