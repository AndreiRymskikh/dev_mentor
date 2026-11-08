import { z } from "zod";
import type { PublicOffer } from "../prices";
export const catalogListSchema = z.object({
  limit: z.coerce.number().int().min(1).max(24).default(12),
  after: z.string().max(100).transform((value, ctx) => {
    const [publishedAt, id, extra] = value.split("|");
    if (extra !== undefined || !z.iso.datetime({precision: 6}).safeParse(publishedAt).success || !z.uuid().safeParse(id).success) {
      ctx.addIssue({code: "custom", message: "Invalid catalog cursor"}); return z.NEVER;
    }
    return {publishedAt, id: id.toLowerCase()};
  }).optional(),
}).strict();
export interface CatalogMentor { slug: string; displayName: string; bio: string | null; stackTags: string[]; offer: PublicOffer }
export interface MentorCatalog { items: CatalogMentor[]; nextCursor: string | null; serverNow: string; refreshAt: string | null }
