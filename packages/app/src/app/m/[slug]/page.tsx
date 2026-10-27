import "../../mentor.css";
import { notFound } from "next/navigation";
import { withScope } from "@devmentor/core/container";
import { AppError } from "@devmentor/core/http";
import { StackTags } from "@devmentor/core/validators/mentors";
import { MentorPageView } from "@devmentor/ui/components/mentors";
import { ErrorMessage } from "@devmentor/ui/backend/feedback";
export const dynamic="force-dynamic";
export default async function PublicMentorPage({params}:{params:Promise<{slug:string}>}) {
  const {slug}=await params;let profile;
  try{profile=await withScope(({mentorProfileService})=>mentorProfileService.getPublicBySlug(slug));}
  catch(error){if(error instanceof AppError&&error.status===404)notFound();return <ErrorMessage message="This mentor page is temporarily unavailable. Please try again."/>;}
  return <main className="dm-mentor mx-auto grid max-w-3xl gap-group"><MentorPageView displayName={profile.displayName} publicWorkUrl={profile.publicWorkUrl} bio={profile.bio} tags={StackTags.options.filter(option=>profile.stackTags.includes(option.value)).map(option=>option.label)}/></main>;
}
