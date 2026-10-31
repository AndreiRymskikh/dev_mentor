"use client";
import { logoutSchema } from "@devmentor/core/validators/users";
import { apiCall } from "@devmentor/ui/backend/api";
import { useFormState } from "@devmentor/ui/backend/forms";
import { Button } from "@devmentor/ui/components/ui/button";
import { ErrorMessage } from "@devmentor/ui/backend/feedback";
export function LogoutButton() {
  const state = useFormState({ schema: logoutSchema, onSubmit: () => apiCall("/api/auth/logout", { method: "POST" }), onSuccess: () => window.location.replace("/login") });
  return <div><Button variant="text" className="dm-logout" loading={state.pending} onClick={() => { void state.submit({}); }}>Sign out</Button>{state.message && <ErrorMessage message="Unable to sign out. Please try again." />}</div>;
}
