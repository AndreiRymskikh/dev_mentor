import { Badge } from "../ui/badge";
import { Link } from "../ui/link";
export function MentorPageView({displayName,bio,publicWorkUrl,tags,heading:Heading="h1"}:{displayName:string;bio:string|null;publicWorkUrl:string|null;tags:readonly string[];heading?:"h1"|"h3"}) {
  return <article className="grid gap-group"><Heading>{displayName}</Heading>{bio&&<p className="whitespace-pre-wrap">{bio}</p>}{publicWorkUrl&&<Link href={publicWorkUrl} target="_blank" rel="noopener noreferrer">See public work</Link>}<ul className="flex flex-wrap gap-2" aria-label="Stack tags">{tags.map(tag=><li key={tag}><Badge>{tag}</Badge></li>)}</ul></article>;
}
