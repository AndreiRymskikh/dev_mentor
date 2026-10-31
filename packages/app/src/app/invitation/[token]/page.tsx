import { StackTags } from "@devmentor/core/validators/mentors";
import "@devmentor/ui/frames.css";
import "../../mentor.css";
import { headers } from "next/headers";
import { withScope } from "@devmentor/core/container";
import { readEnv } from "@devmentor/core/config";
import { AppError } from "@devmentor/core/http";
import { Link } from "@devmentor/ui/components/ui/link";
import { InvitationView } from "@devmentor/ui/components/invitations";
import { LocalTime } from "@devmentor/ui/time";
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
    data = await withScope(async ({ invitationService, sessionService }) => {
      const invitation = await invitationService.lookup(token);
      const principal = await sessionService.resolve(cookie);
      return { invitation, principal, email: principal ? await invitationService.identity(principal.id) : null };
    });
  } catch (error) {
    return <InvitationView account={<Link href="/account">Your account</Link>}>
      {error instanceof AppError && error.status === 404 ? <><h2>This invitation is not valid</h2><p>Ask the person who invited you for a new link.</p></> : <><h2>Invitation unavailable</h2><ErrorMessage message="Unable to load your invitation. Please try again." /><Link href={`/invitation/${encodeURIComponent(token)}`}>Try again</Link></>}
      <Link href="/account">Your account</Link>
    </InvitationView>;
  }
  const { invitation, principal, email } = data;
  const login = `/login?returnTo=${encodeURIComponent(`/invitation/${token}`)}`;
  const publicationDays = readEnv().MENTOR_PUBLISH_WINDOW_DAYS;
  return <InvitationView account={<><Link href={principal ? "/account" : login}>My sessions</Link>{principal ? <Link href="/account">Your account</Link> : <Link href={login}>Sign in</Link>}</>}>
    <h2>You’re invited to mentor</h2>
    <p>Publish your page, set both session prices and add your first bookable time within {publicationDays} days of accepting.</p>
    <p>Invitation for <strong>{invitation.email}</strong></p>
    <ul className="dm-invitation-chips" aria-label="Invited stack">{StackTags.options.filter(option => invitation.stackTags.includes(option.value)).map(option => <li key={option.value}>{option.label}</li>)}</ul>
    <p className="dm-invitation-expiry">Accept this link before <LocalTime value={invitation.expiresAt} />. Your publication deadline starts when you accept.</p>
    {!principal ? <><p>Sign in with the invited email address, or create an account and verify your email, then return here to accept.</p><Link className="dm-button dm-button-primary dm-size-default dm-primary-link" href={login}>Sign in to accept</Link></> : email === invitation.email ? <><p>Accept as {principal.displayName}. Your existing roles stay available.</p><AcceptButton token={token} /></> : <><ErrorMessage message={`You are signed in as ${email}. Sign out and sign in with ${invitation.email} to accept.`} /><Link href="/account">Manage your account</Link><Link href={login}>Sign in with the invited account</Link></>}
    <p className="dm-invitation-policy">Invitations are optional. Verified users can also become mentors from their account. Creating an account alone does not grant the mentor role.</p>
  </InvitationView>;
}
