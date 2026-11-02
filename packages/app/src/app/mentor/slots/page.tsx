import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { withScope } from "@devmentor/core/container";
import { readSessionCookie } from "../../../auth/session-cookie";
import { ErrorMessage } from "@devmentor/ui/backend/feedback";
import "../../mentor.css";
import "./slots.css";
import { SlotEditor } from "./slot-editor";
import { Link } from "@devmentor/ui/components/ui/link";
export const dynamic = "force-dynamic";
export const metadata = {title: "Availability | DevMentor", robots: {index: false, follow: false}};
// APIs independently reauthorize every call, including current persisted mentor membership.
export default async function SlotsPage() {
  const requestHeaders = await headers();
  const principal = await withScope(({sessionService}) => sessionService.resolve(readSessionCookie({headers: requestHeaders})));
  if (!principal) redirect("/login");
  if (!principal.roles.includes("mentor")) return <ErrorMessage message="Mentor access is required."/>;
  return <main className="dm-mentor dm-slots"><Link href="/mentor">Back to mentor home</Link><h1>Your availability</h1><SlotEditor/></main>;
}
