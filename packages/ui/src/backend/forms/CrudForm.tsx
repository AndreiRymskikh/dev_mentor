"use client";

import { useId } from "react";
import type { ZodType } from "zod";
import type { ApiResult } from "../api";
import { useFormState } from "./useFormState";
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
  const { pending, errors, message, submit } = useFormState({ schema, onSubmit, onSuccess });
  function submitForm(form: HTMLFormElement) {
    const formData = new FormData(form);
    return submit(Object.fromEntries(fields.map((field) => {
      const raw = formData.get(field.name);
      return [field.name, field.type === "checkbox" ? raw === "on" : field.type === "number" ? (raw === "" ? undefined : Number(raw)) : raw];
    })));
  }
  return <form onSubmit={(event) => { event.preventDefault(); void submitForm(event.currentTarget); }} onKeyDown={(event) => {
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
