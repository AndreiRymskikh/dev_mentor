"use client";

import type { ComponentProps } from "react";
import { Label as LabelPrimitive } from "radix-ui";
import { cn } from "../../lib/utils";

// Generated with shadcn 4.22.1; F02/F04: visible label, no disabled opacity.
export function Label({ className, ...props }: ComponentProps<typeof LabelPrimitive.Root>) {
  return <LabelPrimitive.Root {...props} data-slot="label" className={cn("dm-label", className)} />;
}
