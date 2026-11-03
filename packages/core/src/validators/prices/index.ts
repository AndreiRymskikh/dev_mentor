import { z } from "zod";
/** Bounded ASCII major-unit decimals; no coercion, exponent, separators or rounding. */
export const exactMoneySchema = z.string().max(14).regex(/^(0|[1-9]\d*)(\.\d{1,2})?$/, "Use a decimal amount with at most two decimal places.");
export const mentorPricesSchema = z.strictObject({ price25: exactMoneySchema, price50: exactMoneySchema });
export interface PriceBounds { minCents: number; maxCents: number }
export interface PricePolicy { currency: "PLN"; priceBounds: { p25: PriceBounds; p50: PriceBounds } }
export interface Prices { price25Cents: number; price50Cents: number; currency: "PLN" }
export interface PublicOffer {
  prices: Prices | null;
  readiness: { profile: boolean; prices: boolean; availability: boolean };
  mentorOfferReady: boolean;
  serverNow: string;
  refreshAt: string | null;
  bookingAvailable: false;
}
export interface OwnerPrices extends PublicOffer, PricePolicy { savedPrices: {price25Cents: number | null; price50Cents: number | null} }
/** String digit arithmetic remains exact before conversion to a bounded database integer. */
export function parseMoney(input: string): number {
  const value = exactMoneySchema.parse(input);
  const [whole, fraction = ""] = value.split(".");
  const cents = BigInt(whole) * BigInt(100) + BigInt(fraction.padEnd(2, "0"));
  if (cents > BigInt(2147483647)) throw new Error("Amount is too large.");
  return Number(cents);
}
export function formatMoney(cents: number): string {
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, "0")}`;
}
