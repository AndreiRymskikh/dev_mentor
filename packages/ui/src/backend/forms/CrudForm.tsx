"use client";

import { useId, useRef, useState } from "react";
import type { ZodType } from "zod";
import type { ApiResult } from "../api";
import { ErrorMessage } from "../feedback";

interface Field { name: string; label: string; type?: "text" | "email" | "password" | "number" | "checkbox" }
interface Props<T> {
  schema: ZodType<T>;
  fields: Field[];
  initialValues?: Record<string, string | number | boolean>;
  onSubmit: (values: T) => Promise<ApiResult<unknown>>;
  onCancel: () => void;
  onSuccess?: () => void;
}
export function CrudForm<T>({ schema, fields, initialValues = {}, onSubmit, onCancel, onSuccess }: Props<T>) {
  const id = useId();
  const [pending, setPending] = useState(false);
  const inFlight = useRef(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [message, setMessage] = useState<string>();
  async function submit(form: HTMLFormElement) {
    if (inFlight.current) return;
    inFlight.current = true;
    setPending(true);
    setErrors({}); setMessage(undefined);
    try {
      const formData = new FormData(form);
      const values = Object.fromEntries(fields.map((field) => {
        const raw = formData.get(field.name);
        return [field.name, field.type === "checkbox" ? raw === "on" : field.type === "number" ? (raw === "" ? undefined : Number(raw)) : raw];
      }));
      const parsed = await schema.safeParseAsync(values);
      if (!parsed.success) {
        const fieldErrors: Record<string, string[]> = {};
        for (const issue of parsed.error.issues) (fieldErrors[issue.path.map(String).join(".") || "_form"] ??= []).push(issue.message);
        setErrors(fieldErrors); setMessage("Please correct the highlighted fields."); return;
      }
      const result = await onSubmit(parsed.data);
      if (!result.ok) { setErrors(result.error.fieldErrors ?? {}); setMessage(result.error.message); return; }
      onSuccess?.();
    } catch { setMessage("Unable to save. Please try again."); }
    finally { inFlight.current = false; setPending(false); }
  }
  return <form onSubmit={(event) => { event.preventDefault(); void submit(event.currentTarget); }} onKeyDown={(event) => {
    if (event.key === "Escape" && !pending) { event.preventDefault(); onCancel(); }
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) { event.preventDefault(); event.currentTarget.requestSubmit(); }
  }} aria-busy={pending}>
    <fieldset disabled={pending}>
      {fields.map((field) => <div key={field.name}>
        <label htmlFor={`${id}-${field.name}`}>{field.label}</label>
        <input id={`${id}-${field.name}`} name={field.name} type={field.type ?? "text"} defaultValue={field.type === "checkbox" ? undefined : String(initialValues[field.name] ?? "")} defaultChecked={field.type === "checkbox" ? Boolean(initialValues[field.name]) : undefined} aria-invalid={Boolean(errors[field.name])} aria-describedby={errors[field.name] ? `${id}-${field.name}-error` : undefined} />
        {errors[field.name] && <p id={`${id}-${field.name}-error`}>{errors[field.name].join(" ")}</p>}
      </div>)}
      {message && <ErrorMessage message={message} />}
      {errors._form && <ErrorMessage message={errors._form.join(" ")} />}
      <button type="submit">{pending ? "Saving…" : "Save"}</button>
      <button type="button" onClick={onCancel}>Cancel</button>
    </fieldset>
  </form>;
}
