import type { MentorPricesRepository, OfferRecord } from "@devmentor/db";
import { z } from "zod";
import { AppError, ForbiddenError, NotFoundError, ServiceUnavailableError, UnauthorizedError } from "../../http/errors";
import { userIdSchema } from "../../validators/users/roles.schema";
import { mentorSlugSchema } from "../../validators/mentors/mentor-profile-update.schema";
import { mentorPricesSchema, parseMoney, formatMoney, type PricePolicy, type PublicOffer, type OwnerPrices } from "../../validators/prices";
import { readPricePolicy } from "./policy";
function valid(value: number | null, bound: {minCents: number; maxCents: number}): value is number {
  return value !== null && Number.isInteger(value) && value >= bound.minCents && value <= bound.maxCents;
}
export function publicOffer(record: OfferRecord, policy: PricePolicy): PublicOffer {
  const priced = valid(record.price25Cents, policy.priceBounds.p25) && valid(record.price50Cents, policy.priceBounds.p50);
  return {prices: priced ? {price25Cents: record.price25Cents!, price50Cents: record.price50Cents!, currency: policy.currency} : null,
    readiness: {profile: record.published, prices: priced, availability: record.availability},
    mentorOfferReady: record.published && priced && record.availability, bookingAvailable: false,
    serverNow: record.now.toISOString(), refreshAt: record.refreshAt?.toISOString() ?? null};
}
export class MentorPricesService {
  constructor(private readonly repository: Pick<MentorPricesRepository, "read" | "save" | "publicBySlug">, private readonly policy: () => PricePolicy = readPricePolicy, private readonly clock: () => Date = () => new Date()) {}
  private actor(input: string | null) { const parsed = userIdSchema.safeParse(input); if (!parsed.success) throw new UnauthorizedError(); return parsed.data; }
  private async available<T>(work: () => Promise<T>) {
    try { return await work(); } catch (error) { if (error instanceof AppError) throw error; throw new ServiceUnavailableError(); }
  }
  private owner(record: OfferRecord | null, policy: PricePolicy): OwnerPrices {
    if (!record) throw new ForbiddenError();
    return {...publicOffer(record, policy), ...policy, savedPrices: {price25Cents: record.price25Cents, price50Cents: record.price50Cents}};
  }
  async getMine(actorId: string | null): Promise<OwnerPrices> {
    const actor = this.actor(actorId), policy = this.policy();
    return this.owner(await this.available(() => this.repository.read(actor, this.clock)), policy);
  }
  async update(actorId: string | null, input: unknown): Promise<OwnerPrices> {
    const actor = this.actor(actorId), policy = this.policy(), parsed = mentorPricesSchema.safeParse(input);
    if (!parsed.success) throw new AppError("VALIDATION_ERROR", "Check both session prices.", 422, z.flattenError(parsed.error).fieldErrors);
    const fields: Record<string, string[]> = {}, values = {price25Cents: 0, price50Cents: 0};
    for (const [field, target, bound] of [["price25", "price25Cents", policy.priceBounds.p25], ["price50", "price50Cents", policy.priceBounds.p50]] as const) {
      try {
        const cents = parseMoney(parsed.data[field]);
        if (!valid(cents, bound)) throw new Error("Outside bounds");
        values[target] = cents;
      } catch { fields[field] = [`Enter PLN ${formatMoney(bound.minCents)}–${formatMoney(bound.maxCents)}, inclusive, with at most two decimal places.`]; }
    }
    if (Object.keys(fields).length) throw new AppError("VALIDATION_ERROR", "Check both session prices.", 422, fields);
    return this.owner(await this.available(() => this.repository.save(actor, values, this.clock)), policy);
  }
  async getPublicBySlug(input: unknown): Promise<PublicOffer> {
    const parsed = mentorSlugSchema.safeParse(input); if (!parsed.success) throw new NotFoundError();
    const policy = this.policy(), record = await this.available(() => this.repository.publicBySlug(parsed.data, this.clock));
    if (!record) throw new NotFoundError();
    return publicOffer(record, policy);
  }
}
