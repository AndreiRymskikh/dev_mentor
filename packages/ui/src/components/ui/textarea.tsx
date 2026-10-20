import type { ComponentProps } from "react";
import { cn } from "../../lib/utils";

// Generated with shadcn 4.22.1; A1/F02–F04: resize vertically, preserve entered text.
export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea {...props} data-slot="textarea" className={cn("dm-textarea dm-control dm-focus", className)} />;
}
