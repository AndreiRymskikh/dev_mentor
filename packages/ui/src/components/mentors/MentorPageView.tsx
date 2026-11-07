import { Badge } from "../ui/badge";
import { Link } from "../ui/link";
export function MentorPageView({displayName,bio,publicWorkUrl,tags,heading:Heading="h1"}:{displayName:string;bio:string|null;publicWorkUrl:string|null;tags:readonly string[];heading?:"h1"|"h3"}) {
  const SectionHeading=Heading==="h1"?"h2":"h4";
  return <div className="dm-mentor-profile-view">
    <Heading className="dm-mentor-profile-name">{displayName}</Heading>
    {bio&&<section className="dm-mentor-profile-section"><SectionHeading>About my mentoring</SectionHeading><p className="dm-mentor-profile-bio">{bio}</p></section>}
    {tags.length>0&&<section className="dm-mentor-profile-section"><SectionHeading>Technologies and topics</SectionHeading><ul className="dm-mentor-profile-tags" aria-label="Technologies and topics">{tags.map(tag=><li key={tag}><Badge>{tag}</Badge></li>)}</ul></section>}
    {publicWorkUrl&&<Link href={publicWorkUrl} target="_blank" rel="noopener noreferrer">Explore my work</Link>}
  </div>;
}
