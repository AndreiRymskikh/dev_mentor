import "../../mentor.css";
import { headers } from "next/headers";
import { withScope } from "@devmentor/core/container";
import { AppError } from "@devmentor/core/http";
import { Link } from "@devmentor/ui/components/ui/link";
import { ErrorMessage } from "@devmentor/ui/backend/feedback";
import { readSessionCookie } from "../../../auth/session-cookie";
import { AcceptButton } from "./accept-button";
export const dynamic = "force-dynamic";
export const metadata = { title: "Mentor invitation | DevMentor", robots: { index: false, follow: false }, referrer: "no-referrer" as const };
export default async function InvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  let data;
  try {
    const cookie = readSessionCookie({ headers: await headers() });
    data = await withScope(async ({ invitationService, sessionService }) => { const invitation = await invitationService.lookup(token); const principal = await sessionService.resolve(cookie); return { invitation, principal, email: principal ? await invitationService.identity(principal.id) : null }; });
  } catch (error) {
    if (error instanceof AppError && error.status === 404) return <main className="dm-mentor mx-auto grid max-w-xl gap-group p-group"><h1>This invitation is not valid</h1><p>Ask the person who invited you for a new link.</p><Link href="/account">Your account</Link></main>;
    return <ErrorMessage message="Unable to load your invitation. Please try again." />;
  }
  const { invitation, principal, email } = data;
  return <main className="dm-mentor mx-auto grid max-w-xl gap-group p-group"><Link href="/">DevMentor</Link><h1 className="text-3xl font-semibold">You’re invited to mentor</h1><p>Invitation for {invitation.email}</p><p>{invitation.stackTags.join(", ")}</p>{!principal ? <><p>Sign in with the invited email address, then return to this link to accept.</p><Link href={`/login?returnTo=${encodeURIComponent(`/invitation/${token}`)}`}>Sign in</Link></> : email === invitation.email ? <><p>Accept as {principal.displayName}. Your existing roles stay available.</p><AcceptButton token={token} /></> : <><p>You are signed in as {email}. Sign out and sign in with {invitation.email} to accept.</p><Link href="/account">Manage your account</Link></>}</main>;
}
