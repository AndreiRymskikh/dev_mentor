import { DuplicateSlotError, type SlotRepository, type SlotRecord } from "@devmentor/db";
import { AppError, ConflictError, ForbiddenError, NotFoundError, ServiceUnavailableError, UnauthorizedError } from "../../http/errors";
import { userIdSchema } from "../../validators/users/roles.schema";
import { mentorSlugSchema } from "../../validators/mentors/mentor-profile-update.schema";
import { slotPublishSchema, slotIdSchema, type PublicAvailability, type OwnerAvailability } from "../../validators/availability/slot.schema";
const LEAD = 2 * 60 * 60 * 1000;
/** Six UTC calendar months, clamping month-end days without local timezone/DST arithmetic. */
export function publicationLimit(now: Date): Date {
  const limit = new Date(now), day = limit.getUTCDate();
  limit.setUTCDate(1); limit.setUTCMonth(limit.getUTCMonth() + 7); limit.setUTCDate(0);
  limit.setUTCDate(Math.min(day, limit.getUTCDate()));
  return limit;
}
export function availabilityDto(records: SlotRecord[], now: Date, includePast: boolean): PublicAvailability {
  const slots = records.filter(slot => includePast || slot.startsAt > now).map(slot => ({ id: slot.id, startsAt: slot.startsAt.toISOString(), eligible: slot.startsAt.getTime() - now.getTime() >= LEAD }));
  const changes = records.flatMap(slot => [slot.startsAt.getTime() - LEAD + 1, slot.startsAt.getTime()]).filter(value => value > now.getTime());
  return { serverNow: now.toISOString(), refreshAt: changes.length ? new Date(Math.min(...changes)).toISOString() : null, slots };
}
export class SlotService {
  constructor(private readonly repository: Pick<SlotRepository, "read" | "publish" | "remove" | "publicBySlug">, private readonly clock: () => Date = () => new Date()) {}
  private actor(input: string | null) { const parsed = userIdSchema.safeParse(input); if (!parsed.success) throw new UnauthorizedError(); return parsed.data; }
  private async available<T>(work: () => Promise<T>) {
    try { return await work(); } catch (error) {
      if (error instanceof AppError) throw error;
      if (error instanceof DuplicateSlotError) throw new ConflictError("This start time is already published.");
      throw new ServiceUnavailableError();
    }
  }
  async getMine(actorId: string | null): Promise<OwnerAvailability> {
    const actor = this.actor(actorId), record = await this.available(() => this.repository.read(actor));
    if (!record) throw new ForbiddenError();
    const now = this.clock(), dto = availabilityDto(record.slots, now, true);
    return { ...dto, lastPublishedAvailabilityAt: record.lastPublishedAvailabilityAt?.toISOString() ?? null, availabilityComplete: dto.slots.some(slot => slot.eligible), policy: { publicationMonths: 6, eligibilityLeadHours: 2, latestPublishAt: publicationLimit(now).toISOString() } };
  }
  async publish(actorId: string | null, input: unknown) {
    const actor = this.actor(actorId), parsed = slotPublishSchema.safeParse(input);
    if (!parsed.success) throw new AppError("VALIDATION_ERROR", "Supply an ISO start instant with an explicit timezone.", 422, { startsAt: ["Use an ISO timestamp with Z or an explicit offset."] });
    const startsAt = new Date(parsed.data.startsAt);
    const saved = await this.available(() => this.repository.publish(actor, startsAt, () => {
      const now = this.clock();
      if (startsAt <= now || startsAt > publicationLimit(now)) throw new AppError("VALIDATION_ERROR", "Choose a future start within six months.", 422, { startsAt: ["Choose a strictly future start no more than six UTC calendar months ahead."] });
      return now;
    }));
    if (!saved) throw new ForbiddenError();
    return this.getMine(actor);
  }
  async remove(actorId: string | null, input: unknown) {
    const actor = this.actor(actorId), parsed = slotIdSchema.safeParse(input);
    if (!parsed.success) throw new NotFoundError();
    const result = await this.available(() => this.repository.remove(actor, parsed.data, this.clock));
    if (result === "forbidden") throw new ForbiddenError();
    if (result === "missing") throw new NotFoundError();
    return this.getMine(actor);
  }
  async getPublicBySlug(input: unknown): Promise<PublicAvailability> {
    const parsed = mentorSlugSchema.safeParse(input); if (!parsed.success) throw new NotFoundError();
    const slots = await this.available(() => this.repository.publicBySlug(parsed.data));
    if (!slots) throw new NotFoundError();
    return availabilityDto(slots, this.clock(), false);
  }
}
