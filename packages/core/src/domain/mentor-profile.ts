import type { ReadinessItem } from "./readiness";
export interface PublicMentorProfile { displayName:string;publicWorkUrl:string|null;bio:string|null;stackTags:string[];slug:string|null }
export interface OwnerMentorProfile extends PublicMentorProfile { publishedAt:string|null;readiness:ReadinessItem[] }
