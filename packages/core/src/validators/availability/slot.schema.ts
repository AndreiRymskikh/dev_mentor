import { z } from "zod";
// Millisecond precision matches the JS clock and PostgreSQL writes; offsets are explicit.
export const slotPublishSchema = z.object({ startsAt: z.iso.datetime({ offset: true, precision: 3 }).or(z.iso.datetime({ offset: true, precision: 0 })) }).strict();
export const slotIdSchema = z.uuid().transform(value => value.toLowerCase());
export const slotUtcFormSchema = z.object({ startsAt: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Enter UTC as YYYY-MM-DDTHH:mm").transform(value => `${value}:00.000Z`).pipe(slotPublishSchema.shape.startsAt) });
export const slotListSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  view: z.enum(["future", "all"]).default("future"),
  after: z.string().max(100).transform((value, ctx) => {
    const [startsAt, id, extra] = value.split("|");
    if (extra !== undefined || !z.iso.datetime({precision:3}).safeParse(startsAt).success || !slotIdSchema.safeParse(id).success) {
      ctx.addIssue({code:"custom",message:"Invalid availability cursor"}); return z.NEVER;
    }
    return { startsAt, id: id.toLowerCase() };
  }).optional(),
}).strict();
export interface AvailabilitySlot { id: string; startsAt: string; eligible: boolean }
export interface PublicAvailability { serverNow: string; refreshAt: string | null; slots: AvailabilitySlot[]; nextCursor: string | null }
export interface OwnerAvailability extends PublicAvailability {
  lastPublishedAvailabilityAt: string | null;
  availabilityComplete: boolean;
  policy: { publicationMonths: number; eligibilityLeadHours: number; latestPublishAt: string };
}
