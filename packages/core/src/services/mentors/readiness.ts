import { defineReadiness } from "../../domain/readiness";
export interface ProfileFields { publicWorkUrl: string | null; bio: string | null; stackTags: readonly string[] }
export const mentorPagePublishable=defineReadiness<ProfileFields>([
  {field:"publicWorkUrl",label:"Public work link",message:"Add a link to your public work.",test:profile=>Boolean(profile.publicWorkUrl)},
  {field:"bio",label:"Experience description",message:"Describe your experience.",test:profile=>Boolean(profile.bio?.trim())},
  {field:"stackTags",label:"Stack tags",message:"Choose at least one stack tag.",test:profile=>profile.stackTags.length>0},
]);
