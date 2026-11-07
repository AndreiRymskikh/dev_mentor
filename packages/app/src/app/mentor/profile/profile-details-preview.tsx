"use client";
import { type PublicMentorProfileDetails } from "@devmentor/core/validators/mentors";
import { useApiResource } from "@devmentor/ui/backend/api";
import { ResourcePanel } from "@devmentor/ui/backend/panels";
import { protectedRequest } from "../../../auth/protected-request";
import { ProfileDetailsView } from "./profile-details-view";
export function ProfileDetailsPreview() {
  const resource=useApiResource<PublicMentorProfileDetails>("/api/mentors/me/details",protectedRequest<PublicMentorProfileDetails>);
  return <div aria-label="Optional details preview"><ResourcePanel resource={resource}>{details=><ProfileDetailsView details={details} heading="h4"/>}</ResourcePanel></div>;
}
