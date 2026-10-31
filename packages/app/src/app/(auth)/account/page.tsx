import { PrivateContent } from "../../../auth/private-content";
import { Workspace } from "../../workspace";
import { Button } from "@devmentor/ui/components/ui/button";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { withScope } from "@devmentor/core/container";
import { readSessionCookie } from "../../../auth/session-cookie";
import { MentorButton } from "./mentor-button";
import { LogoutButton } from "./logout-button";
import { Link } from "@devmentor/ui/components/ui/link";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your account | DevMentor", robots: { index: false, follow: false } };
export default async function AccountPage() {
  let principal;
  try {
    const token = readSessionCookie({ headers: await headers() });
    principal = await withScope(({ sessionService }) => sessionService.resolve(token));
  } catch {
    return <main role="alert"><h1>Account temporarily unavailable</h1><p>We could not load your account. Please try again.</p><Link href="/account">Try again</Link></main>;
  }
  if (!principal) redirect("/login");
  return <PrivateContent><Workspace identity={principal.displayName} roles={principal.roles} current="account" signOut={<LogoutButton />}>
    <h1>My sessions</h1><section className="dm-workspace-panel dm-empty-sessions" aria-label="Session availability"><h2>Sessions are not available yet</h2><p>Find a mentor and choose a time when the mentor catalog becomes available.</p><Button disabled disabledReason="The mentor catalog is not available yet.">Find a mentor</Button></section>
    <section className="dm-workspace-account" aria-label="Your account"><h2>Your account</h2><p>{principal.displayName}</p>{!principal.roles.includes("mentor") && <MentorButton />}</section>
  </Workspace></PrivateContent>;
}
