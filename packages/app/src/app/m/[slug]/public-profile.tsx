import { PublicOfferPanel } from "./public-offer";
import { PublicSlots } from "./public-availability";
import type { PublicMentorProfile, PublicMentorProfileDetails } from "@devmentor/core/validators/mentors";
import { SessionLanguages, StackTags } from "@devmentor/core/validators/mentors";
import { Link } from "@devmentor/ui/components/ui/link";
import { Button } from "@devmentor/ui/components/ui/button";
import { Badge } from "@devmentor/ui/components/ui/badge";
export function PublicProfile({profile,details}:{profile:PublicMentorProfile;details:PublicMentorProfileDetails}) {
  const language=SessionLanguages.find(option=>option.value===details.sessionLanguage)?.label;
  const initials=profile.displayName.trim().split(/\s+/).slice(0,2).map(part=>part[0]).join("").toUpperCase();
  return <div className="dm-public-profile"><header className="dm-public-header"><Link href="/" className="dm-public-brand">DevMentor <span aria-hidden="true">✦</span></Link><nav aria-label="Public navigation"><span aria-disabled="true">Mentors <small>(coming soon)</small></span><Link href="/account">My workspace</Link><Link href="/login">Sign in</Link></nav></header>
  <main className="dm-public-columns"><article className="dm-public-content"><section className="dm-public-hero"><div className="dm-public-identity"><span className="dm-public-avatar" aria-hidden="true">{initials}</span><div><p>Developer mentor</p><h1>{profile.displayName}</h1></div></div>{profile.bio&&<p className="dm-public-summary">{profile.bio}</p>}<ul className="dm-public-tags" aria-label="Stack tags">{StackTags.options.filter(option=>profile.stackTags.includes(option.value)).map(option=><li key={option.value}><Badge>{option.label}</Badge></li>)}</ul>
  {(language||details.mentorTimeZone)&&<dl className="dm-public-meta">{language&&<div><dt>Session language</dt><dd>{language}</dd></div>}{details.mentorTimeZone&&<div><dt>Mentor timezone</dt><dd>{details.mentorTimeZone}</dd></div>}</dl>}</section>
  {profile.publicWorkUrl&&<section><h2>Public work</h2><Link href={profile.publicWorkUrl} target="_blank" rel="noopener noreferrer">View public work</Link></section>}
  {profile.bio&&<section><h2>About me</h2><p>{profile.bio}</p></section>}
  {details.helpTopics.length>0&&<section><h2>What I can help with</h2><ul className="dm-public-topics">{details.helpTopics.map(topic=><li key={topic.title}><span aria-hidden="true">✓</span><div><h3>{topic.title}</h3><p>{topic.description}</p></div></li>)}</ul></section>}
  {details.sampleAnswer&&<section><h2>Sample answer</h2><div className="dm-public-sample"><p className="dm-public-eyebrow">Example walkthrough</p><h3>{details.sampleAnswer.title}</h3><p>{details.sampleAnswer.intro}</p>{details.sampleAnswer.codeExcerpt&&<pre tabIndex={0} aria-label="Sample code excerpt"><code>{details.sampleAnswer.codeExcerpt}</code></pre>}<details><summary>Read the sample answer</summary><p className="dm-public-answer">{details.sampleAnswer.body}</p></details></div></section>}
  {details.sessionSteps.length>0&&<section><h2>How I run a session</h2><ol className="dm-public-steps">{details.sessionSteps.map((step,index)=><li key={step.title}><span aria-hidden="true">{String(index+1).padStart(2,"0")}</span><div><h3>{step.title}</h3><p>{step.description}</p></div></li>)}</ol></section>}</article>
  <aside className="dm-public-offer" aria-label="Session availability"><p>Sessions with {profile.displayName}</p><h2>Choose your session.</h2><PublicOfferPanel slug={profile.slug!}/><PublicSlots slug={profile.slug!}/><Button disabled>Choose a session</Button><p>Booking is not available on DevMentor yet. This page shares the mentor’s public work and approach.</p></aside></main>
  <footer className="dm-public-footer"><p>Get coding help from a mentor.</p><Link href="/account">Your workspace</Link></footer></div>;
}
