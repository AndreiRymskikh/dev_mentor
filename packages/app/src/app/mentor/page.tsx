import "../mentor.css";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { withScope } from "@devmentor/core/container";
import { Link } from "@devmentor/ui/components/ui/link";
import { ErrorMessage, ReadinessChecklist } from "@devmentor/ui/backend/feedback";
import { LocalTime } from "@devmentor/ui/time";
import { readSessionCookie } from "../../auth/session-cookie";
export const dynamic = "force-dynamic";
export default async function MentorPage() {
  const cookie = readSessionCookie({ headers: await headers() });
  const principal = await withScope(({ sessionService }) => sessionService.resolve(cookie));
  if (!principal) redirect("/login");
  if (!principal.roles.includes("mentor")) return <ErrorMessage message="Mentor access is required." />;
  const onboarding = await withScope(({ invitationService }) => invitationService.onboarding(principal.id));
  const profile = await withScope(({ mentorProfileService }) => mentorProfileService.getMine(principal.id));
  return <main className="dm-mentor mx-auto grid max-w-2xl gap-group p-group"><h1 className="text-3xl font-semibold">Your mentor home</h1><p>Welcome, {principal.displayName}.</p>{onboarding.initialPublishDueAt ? <p>Publish at least one bookable session by <LocalTime value={onboarding.initialPublishDueAt} />.</p> : <p>Prepare your mentor profile to share your experience.</p>}<h2>Your mentor page</h2><ReadinessChecklist items={[...profile.readiness.map(item=>({...item,href:"/mentor/profile"})),{field:"publishedAt",label:"Published mentor page",met:profile.publishedAt!==null,href:"/mentor/profile"}]} /><Link href="/mentor/profile">Edit your mentor profile</Link><Link href="/account">Your account</Link></main>;
}
