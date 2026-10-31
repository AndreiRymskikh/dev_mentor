"use client";
import { useRouter } from "next/navigation";
import { mentorEnrollmentSchema } from "@devmentor/core/validators/users";
import { protectedRequest } from "../../../auth/protected-request";
import { useFormState } from "@devmentor/ui/backend/forms";
import { Button } from "@devmentor/ui/components/ui/button";
import { ErrorMessage } from "@devmentor/ui/backend/feedback";
export function MentorButton() {
  const router = useRouter();
  const state = useFormState({ schema: mentorEnrollmentSchema, onSubmit: () => protectedRequest("/api/users/me/mentor", { method: "POST", body: "{}" }), onSuccess: () => router.refresh() });
  return <div><Button loading={state.pending} onClick={() => { void state.submit({}); }}>Become a mentor</Button>{state.message && <ErrorMessage message={state.message} />}</div>;
}
