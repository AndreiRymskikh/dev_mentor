import { defineReadiness } from "../../domain/readiness";
export interface ProfileFields { publicWorkUrl: string | null; bio: string | null; stackTags: readonly string[] }
export const mentorPagePublishable=defineReadiness<ProfileFields>([
  {field:"bio",label:"Experience description",message:"Experience description is required.",test:profile=>Boolean(profile.bio?.trim())},
  {field:"stackTags",label:"Stack tags",message:"At least one technology or topic is required.",test:profile=>profile.stackTags.length>0},
]);
