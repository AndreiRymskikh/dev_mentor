import type { ComponentProps } from "react";
import { cn } from "../../lib/utils";

export interface LinkProps extends ComponentProps<"a"> { href: string }

/** N02/ENG: public-work links must not execute user-supplied script schemes. */
export function Link({ className, href, target, rel, ...props }: LinkProps) {
  const protocol = new URL(href, "https://devmentor.invalid").protocol;
  if (!["http:", "https:", "mailto:"].includes(protocol)) throw new Error("Link requires a web, email or relative URL");
  const safeRel = target === "_blank" ? [...new Set(["noopener", "noreferrer", ...rel?.split(/\s+/) ?? []])].join(" ") : rel;
  return <a {...props} href={href} target={target} rel={safeRel} data-slot="link" className={cn("dm-link dm-focus", className)} />;
}
