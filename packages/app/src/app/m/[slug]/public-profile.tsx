import { ProfileDetailsView } from "../../mentor/profile/profile-details-view";
import { PublicOfferPanel } from "./public-offer";
import { PublicSlots } from "./public-availability";
import type { PublicMentorProfile, PublicMentorProfileDetails } from "@devmentor/core/validators/mentors";
import { StackTags } from "@devmentor/core/validators/mentors";
import { Link } from "@devmentor/ui/components/ui/link";
import { Button } from "@devmentor/ui/components/ui/button";
import { MentorPageView } from "@devmentor/ui/components/mentors";
export function PublicProfile({profile,details}:{profile:PublicMentorProfile;details:PublicMentorProfileDetails}) {
  const initials=profile.displayName.trim().split(/\s+/).slice(0,2).map(part=>part[0]).join("").toUpperCase();
  return <div className="dm-public-profile"><header className="dm-public-header"><Link href="/" className="dm-public-brand">DevMentor <span aria-hidden="true">✦</span></Link><nav aria-label="Public navigation"><span aria-disabled="true">Mentors <small>(coming soon)</small></span><Link href="/account">My workspace</Link><Link href="/login">Sign in</Link></nav></header>
  <main className="dm-public-columns"><article className="dm-public-content"><section className="dm-public-hero"><div className="dm-public-identity"><span className="dm-public-avatar" aria-hidden="true">{initials}</span><p>Developer mentor</p></div><MentorPageView displayName={profile.displayName} bio={profile.bio} publicWorkUrl={profile.publicWorkUrl} tags={StackTags.options.filter(option=>profile.stackTags.includes(option.value)).map(option=>option.label)}/>
  </section><ProfileDetailsView details={details}/></article>
  <aside className="dm-public-offer" aria-label="Session availability"><p>Sessions with {profile.displayName}</p><h2>Choose your session.</h2><PublicOfferPanel slug={profile.slug!}/><PublicSlots slug={profile.slug!}/><Button disabled>Choose a session</Button><p>Booking is not available on DevMentor yet. This page shares the mentor’s public work and approach.</p></aside></main>
  <footer className="dm-public-footer"><p>Get coding help from a mentor.</p><Link href="/account">Your workspace</Link></footer></div>;
}
