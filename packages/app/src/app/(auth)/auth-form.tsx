"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { registerSchema, loginSchema, passwordForgotSchema } from "@devmentor/core/validators/users";
import { apiCall } from "@devmentor/ui/backend/api";
import { useFormState } from "@devmentor/ui/backend/forms";
import { FormField } from "@devmentor/ui/backend/fields";
import { ErrorMessage } from "@devmentor/ui/backend/feedback";
import { Input } from "@devmentor/ui/components/ui/input";
import { Button } from "@devmentor/ui/components/ui/button";
import { Link } from "@devmentor/ui/components/ui/link";

const definitions = {
  register: { title: "Create your account", action: "Create account", schema: registerSchema, endpoint: "/api/auth/register", success: "If this address can be registered, a verification email will arrive shortly. Check your inbox and spam folder." },
  login: { title: "Sign in", action: "Sign in", schema: loginSchema, endpoint: "/api/auth/login", success: "Signed in." },
  forgot: { title: "Reset your password", action: "Send reset email", schema: passwordForgotSchema, endpoint: "/api/auth/password/forgot", success: "If this address has an eligible account, a password reset email will arrive shortly. Check your inbox and spam folder." },
};
export function AuthForm({ mode }: { mode: keyof typeof definitions }) {
  const definition = definitions[mode];
  const router = useRouter();
  const form = useRef<HTMLFormElement>(null);
  const [success, setSuccess] = useState(false);
  const [github, setGithub] = useState(false);
  const { pending, errors, message, submit } = useFormState({
    schema: definition.schema,
    failureMessage: "Unable to continue. Please try again.",
    onSubmit: async (values) => {
      const result = await apiCall(definition.endpoint, { method: "POST", body: JSON.stringify(values) });
      if (!result.ok && result.error.code === "UNAUTHORIZED") return { ...result, error: { ...result.error, message: "Unable to sign in. Check your email and password, and verify your email before signing in." } };
      return result;
    },
    onSuccess: () => { setSuccess(true); if (mode === "login") router.replace("/account"); },
  });
  useEffect(() => { form.current?.querySelector<HTMLInputElement>('[aria-invalid="true"]')?.focus(); }, [errors]);
  const fields = [
    ...(mode === "register" ? [{ name: "displayName", label: "Display name", type: "text", autoComplete: "nickname", hint: "The name shown on your account." }] : []),
    { name: "email", label: "Email address", type: "email", autoComplete: "email", hint: "Use the email address for your account." },
    ...(mode !== "forgot" ? [{ name: "password", label: "Password", type: "password", autoComplete: mode === "register" ? "new-password" : "current-password", hint: mode === "register" ? "Use 12–72 UTF-8 bytes. Most letters use one byte; some characters use more." : "Enter your account password." }] : []),
  ];
  return <div className="grid gap-group">
    <div><Link href="/">DevMentor</Link><h1 className="mt-group text-3xl font-semibold">{definition.title}</h1></div>
    <form ref={form} noValidate aria-busy={pending} onSubmit={(event) => { event.preventDefault(); setSuccess(false); const data = new FormData(event.currentTarget); void submit(Object.fromEntries(fields.map((field) => [field.name, data.get(field.name)]))); }} onKeyDown={(event) => { if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) { event.preventDefault(); event.currentTarget.requestSubmit(); } }}>
      <fieldset disabled={pending} className="grid gap-group">
        {fields.map((field) => <FormField key={field.name} label={field.label} hint={field.hint} required error={errors[field.name]?.join(" ")}>
          {(control) => <Input {...control} name={field.name} type={field.type} autoComplete={field.autoComplete} />}
        </FormField>)}
        {message && <ErrorMessage message={message} />}
        {message === "Too many requests" && <p className="dm-help">Please wait before trying again. Request limits help protect your account.</p>}
        {errors._form && <ErrorMessage message={errors._form.join(" ")} />}
        <Button type="submit" loading={pending}>{pending ? "Please wait…" : definition.action}</Button>
      </fieldset>
    </form>
    {success && <div role="status"><p>{definition.success}</p>{mode === "register" && <Link href="/verify-email">Need another verification email?</Link>}</div>}
    {mode !== "forgot" && <><Button variant="text" onClick={() => setGithub(true)}>Continue with GitHub</Button>{github && <p role="status">GitHub sign-in will be implemented soon.</p>}</>}
    <nav aria-label="Account help" className="flex flex-wrap gap-group">
      {mode !== "login" && <Link href="/login">Sign in</Link>}
      {mode !== "register" && <Link href="/register">Create account</Link>}
      {mode === "login" && <><Link href="/forgot-password">Forgot password?</Link><Link href="/verify-email">Resend verification email</Link></>}
    </nav>
  </div>;
}
