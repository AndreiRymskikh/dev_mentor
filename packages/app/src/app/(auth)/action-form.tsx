"use client";
import { useRef, useState, useEffect } from "react";
import { passwordResetSchema, verificationConfirmSchema, verificationRequestSchema } from "@devmentor/core/validators/users";
import { apiCall } from "@devmentor/ui/backend/api";
import { useFormState } from "@devmentor/ui/backend/forms";
import { FormField } from "@devmentor/ui/backend/fields";
import { ErrorMessage } from "@devmentor/ui/backend/feedback";
import { Input } from "@devmentor/ui/components/ui/input";
import { Button } from "@devmentor/ui/components/ui/button";
import { Link } from "@devmentor/ui/components/ui/link";
import { useActionToken } from "./use-action-token";

function ResendVerification() {
  const [sent, setSent] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const state = useFormState({ schema: verificationRequestSchema, onSubmit: (values) => apiCall("/api/auth/verification/request", { method: "POST", body: JSON.stringify(values) }), onSuccess: () => setSent(true) });
  useEffect(() => { form.current?.querySelector<HTMLInputElement>('[aria-invalid="true"]')?.focus(); }, [state.errors]);
  return <form ref={form} noValidate aria-busy={state.pending} onSubmit={(event) => { event.preventDefault(); setSent(false); void state.submit({ email: new FormData(event.currentTarget).get("email") }); }}>
    <fieldset disabled={state.pending} className="grid gap-group"><FormField label="Email address" required error={state.errors.email?.join(" ")}>{(control) => <Input {...control} name="email" type="email" autoComplete="email" />}</FormField>
      {state.message && <ErrorMessage message={state.message} />}<Button type="submit" loading={state.pending}>Send verification email</Button>
    </fieldset>{sent && <p role="status">If this address has an eligible account, a verification email will arrive shortly. Check your inbox and spam folder.</p>}
  </form>;
}
export function ActionForm({ mode }: { mode: "verify" | "reset" }) {
  const verify = mode === "verify";
  const token = useActionToken(verify ? "/verify-email" : "/reset-password");
  const [done, setDone] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const state = useFormState({ schema: verify ? verificationConfirmSchema : passwordResetSchema,
    onSubmit: async (values) => {
      const result = await apiCall(verify ? "/api/auth/verification/confirm" : "/api/auth/password/reset", { method: "POST", body: JSON.stringify(values) });
      if (!result.ok && result.error.code === "VALIDATION_ERROR") return { ...result, error: { ...result.error, message: "The link may be invalid, expired or already used. Request a new email." } };
      return result;
    },
    onSuccess: () => setDone(true),
  });
  useEffect(() => { form.current?.querySelector<HTMLInputElement>('[aria-invalid="true"]')?.focus(); }, [state.errors]);
  return <div className="grid gap-group"><Link href="/">DevMentor</Link><h1 className="text-3xl font-semibold">{verify ? "Verify your email" : "Choose a new password"}</h1>
    {done ? <div role="status"><p>{verify ? "Email verified. Sign in to continue." : "Password changed. Your existing sessions have been signed out. Sign in with your new password."}</p><Link href="/login">Sign in</Link></div> : token ? <form ref={form} noValidate aria-busy={state.pending} onSubmit={(event) => { event.preventDefault(); void state.submit(verify ? { token } : { token, newPassword: new FormData(event.currentTarget).get("newPassword") }); }}>
      <fieldset disabled={state.pending} className="grid gap-group">{verify ? <p>Confirm to verify the email address for this account.</p> : <FormField label="New password" required hint="Use 12–72 UTF-8 bytes." error={state.errors.newPassword?.join(" ")}>{(control) => <Input {...control} name="newPassword" type="password" autoComplete="new-password" />}</FormField>}
      {state.message && <ErrorMessage message={state.message} />}<Button type="submit" loading={state.pending}>{verify ? "Verify email" : "Change password"}</Button></fieldset>
    </form> : <p role="status">Open the link from your email to continue. If the link is missing or no longer works, request a new email.</p>}
    {!done && (verify ? <ResendVerification /> : <Link href="/forgot-password">Request a new reset email</Link>)}
  </div>;
}
