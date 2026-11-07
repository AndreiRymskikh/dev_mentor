import "./profile-details-view.css";
import { SessionLanguages, type PublicMentorProfileDetails } from "@devmentor/core/validators/mentors";
export function ProfileDetailsView({details,heading:Heading="h2"}:{details:PublicMentorProfileDetails;heading?:"h2"|"h4"}) {
  const language=SessionLanguages.find(option=>option.value===details.sessionLanguage)?.label;
  const ItemHeading=Heading==="h2"?"h3":"h5";
  return <div className="dm-profile-details">
  {(language||details.mentorTimeZone)&&<dl className="dm-public-meta">{language&&<div><dt>Session language</dt><dd>{language}</dd></div>}{details.mentorTimeZone&&<div><dt>Mentor timezone</dt><dd>{details.mentorTimeZone}</dd></div>}</dl>}
  {details.helpTopics.length>0&&<section><Heading>What I can help with</Heading><ul className="dm-public-topics">{details.helpTopics.map(topic=><li key={topic.title}><span aria-hidden="true">✓</span><div><ItemHeading>{topic.title}</ItemHeading><p>{topic.description}</p></div></li>)}</ul></section>}
  {details.sampleAnswer&&<section><Heading>Sample answer</Heading><div className="dm-public-sample"><p className="dm-public-eyebrow">Example walkthrough</p><ItemHeading>{details.sampleAnswer.title}</ItemHeading><p>{details.sampleAnswer.intro}</p>{details.sampleAnswer.codeExcerpt&&<pre tabIndex={0} aria-label="Sample code excerpt"><code>{details.sampleAnswer.codeExcerpt}</code></pre>}<details><summary>Read the sample answer</summary><p className="dm-public-answer">{details.sampleAnswer.body}</p></details></div></section>}
  {details.sessionSteps.length>0&&<section><Heading>How I run a session</Heading><ol className="dm-public-steps">{details.sessionSteps.map((step,index)=><li key={step.title}><span aria-hidden="true">{String(index+1).padStart(2,"0")}</span><div><ItemHeading>{step.title}</ItemHeading><p>{step.description}</p></div></li>)}</ol></section>}</div>;
}
