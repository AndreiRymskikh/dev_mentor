"use client";

import { useId, type ComponentProps } from "react";
import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils";

// Generated with shadcn 4.22.1; adapted to A1 and approved F02–F04/F08.
export const buttonVariants = cva("dm-button dm-focus", {
  variants: {
    variant: { primary: "dm-button-primary", text: "dm-button-text" },
    size: { default: "dm-size-default", compact: "dm-size-compact", icon: "dm-size-icon" },
  },
  defaultVariants: { variant: "primary", size: "default" },
});

export interface ButtonProps extends ComponentProps<"button"> {
  variant?: "primary" | "text";
  size?: "default" | "compact" | "icon";
  loading?: boolean;
  disabledReason?: string;
}

export function Button({ className, variant = "primary", size = "default", type = "button", disabled, loading = false, disabledReason, children, ...props }: ButtonProps) {
  const reasonId = useId();
  const reason = disabled && disabledReason;
  const describedBy = [props["aria-describedby"], reason && reasonId].filter(Boolean).join(" ") || undefined;
  return <span className="dm-action">
    <button {...props} data-slot="button" data-variant={variant} data-size={size} type={type} disabled={disabled || loading} aria-busy={loading || undefined} aria-describedby={describedBy} className={cn(buttonVariants({ variant, size }), className)}>{children}</button>
    {loading && <span className="dm-help" role="status">In progress…</span>}
    {reason && <span id={reasonId} className="dm-help">{reason}</span>}
  </span>;
}
