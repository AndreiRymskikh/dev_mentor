import "../../mentor.css";
import "./public-profile.css";
import { notFound } from "next/navigation";
import { withScope } from "@devmentor/core/container";
import { AppError } from "@devmentor/core/http";
import { ErrorMessage } from "@devmentor/ui/backend/feedback";
import { PublicProfile } from "./public-profile";
export const dynamic="force-dynamic";
export default async function PublicMentorPage({params}:{params:Promise<{slug:string}>}) {
  const {slug}=await params;let content;
  try{content=await withScope(async({mentorProfileService,mentorDetailsService})=>({profile:await mentorProfileService.getPublicBySlug(slug),details:await mentorDetailsService.getPublicBySlug(slug)}));}
  catch(error){if(error instanceof AppError&&error.status===404)notFound();return <ErrorMessage message="This mentor page is temporarily unavailable. Please try again."/>;}
  return <PublicProfile {...content}/>;
}
