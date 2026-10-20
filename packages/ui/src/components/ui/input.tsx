import type { ComponentProps } from "react";
import { cn } from "../../lib/utils";

export interface InputProps extends ComponentProps<"input"> { density?: "default" | "compact" }

// Generated with shadcn 4.22.1; A1/F02–F04: native control, product geometry.
export function Input({ className, type = "text", density = "default", ...props }: InputProps) {
  return <input {...props} type={type} data-slot="input" data-density={density} className={cn("dm-input dm-control dm-focus", `dm-size-${density}`, className)} />;
}
