"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useInvitationReturn } from "../../auth/invitation-return";
import { CodeXml } from "lucide-react";
import { useRouter } from "next/navigation";
import { registerSchema, loginSchema, passwordForgotSchema } from "@devmentor/core/validators/users";
import { apiCall } from "@devmentor/ui/backend/api";
import { useFormState } from "@devmentor/ui/backend/forms";
import { FormField } from "@devmentor/ui/backend/fields";
import { ErrorMessage } from "@devmentor/ui/backend/feedback";
import { Input } from "@devmentor/ui/components/ui/input";
import { Button } from "@devmentor/ui/components/ui/button";
import { Link } from "@devmentor/ui/components/ui/link";

function subscribeLocation(callback: () => void) {
  window.addEventListener("popstate", callback);
  return () => window.removeEventListener("popstate", callback);
}
function expiredSnapshot() { return new URLSearchParams(window.location.search).get("reason") === "session-expired"; }
function serverSnapshot() { return false; }
const definitions = {
  register: { title: "Create your account", action: "Create account", schema: registerSchema, endpoint: "/api/auth/register", success: "If this address can be registered, a verification email will arrive shortly. Check your inbox and spam folder." },
  login: { title: "Welcome back", action: "Sign in", schema: loginSchema, endpoint: "/api/auth/login", success: "Signed in." },
  forgot: { title: "Reset your password", action: "Send reset email", schema: passwordForgotSchema, endpoint: "/api/auth/password/forgot", success: "If this address has an eligible account, a password reset email will arrive shortly. Check your inbox and spam folder." },
};
export function AuthForm({ mode }: { mode: keyof typeof definitions }) {
  const definition = definitions[mode];
  const router = useRouter();
  const invitation = useInvitationReturn();
  const form = useRef<HTMLFormElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const [success, setSuccess] = useState(false);
  const expired = useSyncExternalStore(subscribeLocation, expiredSnapshot, serverSnapshot);
  const [github, setGithub] = useState(false);
  const { pending, errors, message, submit } = useFormState({
    schema: definition.schema,
    failureMessage: "Unable to continue. Please try again.",
    onSubmit: async (values) => {
      const result = await apiCall(definition.endpoint, { method: "POST", body: JSON.stringify(values) });
      if (!result.ok && result.error.code === "UNAUTHORIZED") return { ...result, error: { ...result.error, message: "Unable to sign in. Check your email and password, and verify your email before signing in." } };
      return result;
    },
    onSuccess: () => { setSuccess(true); if (mode === "login") { router.replace(invitation.complete() ?? "/account"); } },
  });
  useEffect(() => { form.current?.querySelector<HTMLInputElement>('[aria-invalid="true"]')?.focus(); }, [errors]);
  const accepted = mode === "register" && success;
  useEffect(() => { if (accepted) heading.current?.focus(); }, [accepted]);
  const fields = [
    ...(mode === "register" ? [{ name: "displayName", label: "Display name", type: "text", autoComplete: "nickname", hint: undefined }] : []),
    { name: "email", label: "Email address", type: "email", autoComplete: "email", hint: undefined },
    ...(mode !== "forgot" ? [{ name: "password", label: "Password", type: "password", autoComplete: mode === "register" ? "new-password" : "current-password", hint: mode === "register" ? "Use 12–72 UTF-8 bytes. Most letters use one byte; some characters use more." : undefined }] : []),
  ];
  return <div className="grid gap-group">
    <div><h1 ref={heading} tabIndex={-1} className="text-3xl font-semibold">{accepted ? "Check your inbox" : definition.title}</h1></div>
    {!accepted && mode !== "forgot" && <>
      <p className="dm-auth-intro">{mode === "login" ? "Sign in to open your workspace." : "Get started with text mentoring for developers."}</p>
      {mode === "login" && expired && <div className="dm-status dm-status-warning" role="status"><strong>Your session has expired</strong><p>Sign in again to continue.</p></div>}
      <Button className="dm-github" variant="text" onClick={() => setGithub(true)}><CodeXml aria-hidden="true" />Continue with GitHub</Button>{github && <p role="status">GitHub sign-in will be implemented soon.</p>}
      <div className="dm-auth-divider">or use your email</div>
    </>}
    {accepted ? <div role="status" className="grid gap-group">
      <p>Check your email. If this address can be registered, a verification email will arrive shortly. Check your inbox and spam folder.</p>
      <p>Verify your email using the link, then sign in.</p>
      <nav aria-label="Registration next steps" className="flex flex-wrap gap-group"><Link href={invitation.href("/register")}>Change email</Link><Link href={invitation.href("/login")}>Sign in</Link><Link href={invitation.href("/verify-email")}>Request another verification email</Link></nav>
    </div> : <form ref={form} noValidate aria-busy={pending} onSubmit={(event) => { event.preventDefault(); setSuccess(false); const data = new FormData(event.currentTarget); void submit(Object.fromEntries(fields.map((field) => [field.name, data.get(field.name)]))); }} onKeyDown={(event) => { if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) { event.preventDefault(); event.currentTarget.requestSubmit(); } }}>
      <fieldset disabled={pending} className="grid gap-group">
        {fields.map((field) => <FormField key={field.name} label={field.label} hint={field.hint} required error={errors[field.name]?.join(" ")}>
          {(control) => <Input {...control} name={field.name} type={field.type} autoComplete={field.autoComplete} />}
        </FormField>)}
        {message && <ErrorMessage message={message} />}
        {message === "Too many requests" && <p className="dm-help">Please wait before trying again. Request limits help protect your account.</p>}
        {errors._form && <ErrorMessage message={errors._form.join(" ")} />}
        <Button type="submit" loading={pending}>{pending ? "Please wait…" : definition.action}</Button>
      </fieldset>
    </form>}
    {success && !accepted && <div role="status"><p>{definition.success}</p></div>}
    {!accepted && <nav aria-label="Account help" className="flex flex-wrap gap-group">
      {mode !== "login" && <Link href={invitation.href("/login")}>Sign in</Link>}
      {mode !== "register" && <><span>New to DevMentor?</span><Link href={invitation.href("/register")}>Create account</Link></>}
      {mode === "login" && <><Link href={invitation.href("/forgot-password")}>Forgot password?</Link><Link href={invitation.href("/verify-email")}>Resend verification email</Link></>}
    </nav>}
    <Link className="dm-auth-home" href="/">Back to home</Link>
  </div>;
}
