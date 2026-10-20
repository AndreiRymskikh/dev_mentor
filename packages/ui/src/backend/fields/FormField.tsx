"use client";

import { useId, type ReactNode } from "react";
import { CircleAlert } from "lucide-react";
import { Label } from "../../components/ui/label";

export interface FieldControlProps {
  id: string;
  required: boolean;
  disabled: boolean;
  "aria-invalid": boolean;
  "aria-describedby"?: string;
}
export interface FormFieldProps {
  id?: string;
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  disabledReason?: string;
  children: (control: FieldControlProps) => ReactNode;
}

/** AUTH/F04/F07: compose visible labels and feedback; form owners perform validation. */
export function FormField({ id, label, hint, error, required = false, disabled = false, disabledReason, children }: FormFieldProps) {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const reason = disabled && disabledReason;
  const describedBy = [hint && `${controlId}-hint`, error && `${controlId}-error`, reason && `${controlId}-reason`].filter(Boolean).join(" ") || undefined;
  return <div className="dm-field" data-slot="form-field">
    <Label htmlFor={controlId}>{label}<span className="dm-field-indicator">{required ? "Required" : "Optional"}</span></Label>
    {hint && <p id={`${controlId}-hint`} className="dm-help">{hint}</p>}
    {children({ id: controlId, required, disabled, "aria-invalid": Boolean(error), "aria-describedby": describedBy })}
    {error && <p id={`${controlId}-error`} role="alert" className="dm-field-error"><CircleAlert aria-hidden="true" className="dm-icon" /><span>{error}</span></p>}
    {reason && <p id={`${controlId}-reason`} className="dm-help">{reason}</p>}
  </div>;
}
