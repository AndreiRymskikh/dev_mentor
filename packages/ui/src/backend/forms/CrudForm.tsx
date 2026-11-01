"use client";

import { useId, useRef, useEffect, type ReactNode } from "react";
import type { ZodType } from "zod";
import type { ApiResult } from "../api";
import { useFormState } from "./useFormState";
import { ErrorMessage } from "../feedback";
import { FormField } from "../fields";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Checkbox } from "../../components/ui/checkbox";
import { Button } from "../../components/ui/button";

interface Field { name: string; label: string; hint?: string; required?: boolean; type?: "text" | "email" | "password" | "number" | "checkbox" | "textarea" | "multiselect"; options?: readonly {value:string;label:string;icon?:ReactNode}[] }
interface Props<T> {
  schema: ZodType<T>;
  fields: Field[];
  initialValues?: Record<string, string | number | boolean | readonly string[]>;
  onSubmit: (values: T) => Promise<ApiResult<unknown>>;
  onCancel: () => void;
  onSuccess?: () => void;
  submitLabel?: string;
  additionalActions?: readonly {label:string;onSubmit:(values:T)=>Promise<ApiResult<unknown>>}[];
}
function selected(value:unknown,option:string) {return Array.isArray(value)&&value.includes(option);}
export function CrudForm<T>({ schema, fields, initialValues = {}, onSubmit, onCancel, onSuccess, submitLabel="Save", additionalActions=[] }: Props<T>) {
  const id = useId(), formRef=useRef<HTMLFormElement>(null), handler=useRef(onSubmit);
  const { pending, errors, message, submit } = useFormState({ schema, onSubmit:values=>handler.current(values), onSuccess });
  useEffect(()=>{formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();},[errors]);
  function submitForm(form: HTMLFormElement) {
    const formData = new FormData(form);
    return submit(Object.fromEntries(fields.map((field) => {
      const raw = formData.get(field.name);
      return [field.name, field.type === "multiselect" ? formData.getAll(field.name).map(String) : field.type === "checkbox" ? raw === "on" : field.type === "number" ? (raw === "" ? undefined : Number(raw)) : raw];
    })));
  }
  return <form ref={formRef} noValidate onSubmit={(event) => { event.preventDefault();const selected=Number((event.nativeEvent as SubmitEvent).submitter?.getAttribute("data-submit-action")??-1);handler.current=additionalActions[selected]?.onSubmit??onSubmit;void submitForm(event.currentTarget); }} onKeyDown={(event) => {
    if (event.key === "Escape" && !pending) { event.preventDefault(); onCancel(); }
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) { event.preventDefault(); event.currentTarget.requestSubmit(); }
  }} aria-busy={pending}>
    <fieldset disabled={pending} className="dm-crud-fields">
      {fields.map((field) => field.type==="multiselect" ? <fieldset key={field.name} aria-describedby={errors[field.name]?`${id}-${field.name}-error`:undefined}><legend className="dm-label">{field.label}</legend>{(field.options??[]).map(option=><label key={option.value} className="dm-choice" data-value={option.value}><Checkbox name={field.name} value={option.value} defaultChecked={selected(initialValues[field.name],option.value)} aria-invalid={Boolean(errors[field.name])}/>{option.icon&&<span aria-hidden="true">{option.icon}</span>}<span>{option.label}</span></label>)}{field.hint&&<p className="dm-hint">{field.hint}</p>}{errors[field.name]&&<p id={`${id}-${field.name}-error`} role="alert">{errors[field.name].join(" ")}</p>}</fieldset> : <FormField key={field.name} id={`${id}-${field.name}`} label={field.label} required={field.required} hint={field.hint} error={errors[field.name]?.join(" ")}>
        {control=>field.type==="textarea"?<Textarea {...control} name={field.name} defaultValue={String(initialValues[field.name]??"")}/>:field.type==="checkbox"?<input {...control} name={field.name} type="checkbox" defaultChecked={Boolean(initialValues[field.name])}/>:<Input {...control} name={field.name} type={field.type??"text"} defaultValue={String(initialValues[field.name]??"")}/>}
      </FormField>)}
      {message && <ErrorMessage message={message} />}
      {errors._form && <ErrorMessage message={errors._form.join(" ")} />}
      <div className="dm-form-actions"><Button variant="text" onClick={onCancel}>Cancel</Button><Button type="submit" variant={additionalActions.length?"text":"primary"}>{pending ? "Saving…" : submitLabel}</Button>{additionalActions.map((action,index)=><Button key={action.label} type="submit" data-submit-action={index}>{action.label}</Button>)}</div>
    </fieldset>
  </form>;
}
