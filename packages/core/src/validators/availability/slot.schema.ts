import { z } from "zod";
// Millisecond precision matches the JS clock and PostgreSQL writes; offsets are explicit.
export const slotPublishSchema = z.object({ startsAt: z.iso.datetime({ offset: true, precision: 3 }).or(z.iso.datetime({ offset: true, precision: 0 })) }).strict();
export const slotIdSchema = z.uuid().transform(value => value.toLowerCase());
export const slotUtcFormSchema = z.object({ startsAt: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Enter UTC as YYYY-MM-DDTHH:mm").transform(value => `${value}:00.000Z`).pipe(slotPublishSchema.shape.startsAt) });
export interface AvailabilitySlot { id: string; startsAt: string; eligible: boolean }
export interface PublicAvailability { serverNow: string; refreshAt: string | null; slots: AvailabilitySlot[] }
export interface OwnerAvailability extends PublicAvailability {
  lastPublishedAvailabilityAt: string | null;
  availabilityComplete: boolean;
  policy: { publicationMonths: number; eligibilityLeadHours: number; latestPublishAt: string };
}
