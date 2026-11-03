import { z } from "zod";
import type { PricePolicy } from "../../validators/prices";
import { ServiceUnavailableError } from "../../http/errors";
const bound = z.strictObject({minCents: z.number().int().positive().max(2147483647), maxCents: z.number().int().positive().max(2147483647)}).refine(value => value.minCents <= value.maxCents);
const bounds = z.strictObject({"25": bound, "50": bound});
/** Read lazily, including on every request after configuration changes. No fallback policy. */
export function readPricePolicy(source: Record<string, string | undefined> = process.env): PricePolicy {
  try {
    if (source.PLATFORM_CURRENCY !== "PLN" || !source.PLATFORM_PRICE_BOUNDS || source.PLATFORM_PRICE_BOUNDS.length > 256) throw new Error("Missing or unsupported money policy");
    const parsed = bounds.parse(JSON.parse(source.PLATFORM_PRICE_BOUNDS));
    return {currency: "PLN", priceBounds: {p25: parsed["25"], p50: parsed["50"]}};
  } catch {
    throw new ServiceUnavailableError();
  }
}
