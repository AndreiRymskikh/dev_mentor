import "../mentor.css";
import "@devmentor/ui/frames.css";
import "./slots/slots.css";
import "./mentor-home.css";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { withScope } from "@devmentor/core/container";
import { Link } from "@devmentor/ui/components/ui/link";
import { ErrorMessage } from "@devmentor/ui/backend/feedback";
import { readSessionCookie } from "../../auth/session-cookie";
import { Workspace } from "../workspace";
import { LogoutButton } from "../(auth)/account/logout-button";
import { MentorHome } from "./mentor-home";
export const dynamic = "force-dynamic";
export const metadata = { title: "Mentor workspace | DevMentor", robots: { index: false, follow: false } };
export default async function MentorPage() {
  let principal, onboarding;
  try {
    const cookie = readSessionCookie({ headers: await headers() });
    principal = await withScope(({ sessionService }) => sessionService.resolve(cookie));
    if (principal?.roles.includes("mentor")) {
      const actor = principal.id;
      onboarding = await withScope(({ invitationService }) => invitationService.onboarding(actor));
    }
  } catch {
    return <main><ErrorMessage message="Mentor workspace temporarily unavailable."/><Link href="/mentor">Try again</Link></main>;
  }
  if (!principal) redirect("/login");
  if (!onboarding) return <ErrorMessage message="Mentor access is required." />;
  return <Workspace identity={principal.displayName} roles={principal.roles} current="mentor" signOut={<LogoutButton />}><MentorHome initialPublishDueAt={onboarding.initialPublishDueAt}/></Workspace>;
}
