import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// F03/F06: teach the merger our semantic spacing names instead of raw scale values.
const merge = extendTailwindMerge({ extend: { theme: { spacing: ["related", "group", "panel", "section", "page-gutter", "control", "control-inline"] } } });

export function cn(...inputs: ClassValue[]) {
  return merge(clsx(inputs));
}
