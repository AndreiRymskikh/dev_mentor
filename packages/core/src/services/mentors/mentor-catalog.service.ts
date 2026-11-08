import type { MentorCatalogRepository } from "@devmentor/db";
import { AppError, ServiceUnavailableError } from "../../http/errors";
import { catalogListSchema, type MentorCatalog } from "../../validators/mentors/catalog.schema";
import type { PricePolicy } from "../../validators/prices";
import { publicOffer } from "../prices/mentor-prices.service";
import { readPricePolicy } from "../prices/policy";
export class MentorCatalogService {
  constructor(private readonly repository: Pick<MentorCatalogRepository, "list">, private readonly policy: () => PricePolicy = readPricePolicy, private readonly clock: () => Date = () => new Date()) {}
  async list(input: unknown): Promise<MentorCatalog> {
    const parsed = catalogListSchema.safeParse(input);
    if (!parsed.success) throw new AppError("VALIDATION_ERROR", "Invalid mentor catalog page.", 422);
    const policy = this.policy(), now = this.clock();
    try {
      const records = await this.repository.list(parsed.data, now), page = records.slice(0, parsed.data.limit);
      const items = page.map(record => ({slug: record.slug, displayName: record.displayName, bio: record.bio, stackTags: [...record.stackTags],
        offer: publicOffer({price25Cents: record.price25Cents, price50Cents: record.price50Cents, published: true,
          availability: record.eligibleAt !== null, now, refreshAt: record.eligibleAt ? new Date(record.eligibleAt.getTime() - 7200000 + 1) : null}, policy)}));
      const boundaries = items.flatMap(item => item.offer.refreshAt ? [item.offer.refreshAt] : []).sort();
      const last = page[page.length - 1];
      return {items, serverNow: now.toISOString(), refreshAt: boundaries[0] ?? null,
        nextCursor: records.length > parsed.data.limit ? `${last.publishedAt}|${last.id}` : null};
    } catch (error) { if (error instanceof AppError) throw error; throw new ServiceUnavailableError(); }
  }
}
