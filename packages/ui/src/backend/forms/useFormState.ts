"use client";

import { useRef, useState } from "react";
import type { ZodType } from "zod";
import type { ApiResult } from "../api";

/** Shared schema validation and submission lifecycle, independent of field presentation. */
export function useFormState<T>({ schema, onSubmit, onSuccess, failureMessage = "Unable to save. Please try again." }: {
  schema: ZodType<T>;
  onSubmit: (values: T) => Promise<ApiResult<unknown>>;
  onSuccess?: () => void;
  failureMessage?: string;
}) {
  const inFlight = useRef(false);
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [message, setMessage] = useState<string>();
  async function submit(values: unknown) {
    if (inFlight.current) return;
    inFlight.current = true;
    setPending(true); setErrors({}); setMessage(undefined);
    try {
      const parsed = await schema.safeParseAsync(values);
      if (!parsed.success) {
        const fieldErrors: Record<string, string[]> = {};
        for (const issue of parsed.error.issues) (fieldErrors[issue.path.map(String).join(".") || "_form"] ??= []).push(issue.message);
        setErrors(fieldErrors); setMessage("Please correct the highlighted fields."); return;
      }
      const result = await onSubmit(parsed.data);
      if (!result.ok) { setErrors(result.error.fieldErrors ?? {}); setMessage(result.error.message); return; }
      onSuccess?.();
    } catch { setMessage(failureMessage); }
    finally { inFlight.current = false; setPending(false); }
  }
  return { pending, errors, message, submit };
}
