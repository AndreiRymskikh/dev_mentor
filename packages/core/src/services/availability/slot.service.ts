import { DuplicateSlotError, type SlotRepository, type SlotRecord, type AvailabilityRecord } from "@devmentor/db";
import { AppError, ConflictError, ForbiddenError, NotFoundError, ServiceUnavailableError, UnauthorizedError } from "../../http/errors";
import { userIdSchema } from "../../validators/users/roles.schema";
import { mentorSlugSchema } from "../../validators/mentors/mentor-profile-update.schema";
import { slotPublishSchema, slotIdSchema, slotListSchema, type PublicAvailability, type OwnerAvailability } from "../../validators/availability/slot.schema";
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
  let next: number | null = null;
  for (const slot of records) for (const boundary of [slot.startsAt.getTime() - LEAD + 1, slot.startsAt.getTime()]) {
    if (boundary > now.getTime() && (next === null || boundary < next)) next = boundary;
  }
  return { serverNow: now.toISOString(), refreshAt: next === null ? null : new Date(next).toISOString(), slots, nextCursor: null };
}
export class SlotService {
  constructor(private readonly repository: Pick<SlotRepository, "read" | "publish" | "remove" | "publicBySlug">, private readonly clock: () => Date = () => new Date(), private readonly emit: (event: "availability.slot.published") => void = () => undefined) {}
  private actor(input: string | null) { const parsed = userIdSchema.safeParse(input); if (!parsed.success) throw new UnauthorizedError(); return parsed.data; }
  private async available<T>(work: () => Promise<T>) {
    try { return await work(); } catch (error) {
      if (error instanceof AppError) throw error;
      if (error instanceof DuplicateSlotError) throw new ConflictError("This start time is already published.");
      throw new ServiceUnavailableError();
    }
  }
  private query(input: unknown) {
    const parsed = slotListSchema.safeParse(input);
    if (!parsed.success) throw new AppError("VALIDATION_ERROR", "Invalid availability page.", 422);
    return parsed.data;
  }
  private publicDto(record: AvailabilityRecord): PublicAvailability {
    return { ...availabilityDto(record.slots, record.now, true), refreshAt: record.refreshAt?.toISOString() ?? null,
      nextCursor: record.next ? `${record.next.startsAt.toISOString()}|${record.next.id}` : null };
  }
  private ownerDto(record: AvailabilityRecord): OwnerAvailability {
    return { ...this.publicDto(record), lastPublishedAvailabilityAt: record.lastPublishedAvailabilityAt?.toISOString() ?? null,
      availabilityComplete: record.availabilityComplete, policy: { publicationMonths: 6, eligibilityLeadHours: 2, latestPublishAt: publicationLimit(record.now).toISOString() } };
  }
  async getMine(actorId: string | null, input: unknown = {}): Promise<OwnerAvailability> {
    const actor = this.actor(actorId), query = this.query(input);
    const record = await this.available(() => this.repository.read(actor, query, this.clock, LEAD));
    if (!record) throw new ForbiddenError();
    return this.ownerDto(record);
  }
  async publish(actorId: string | null, input: unknown) {
    const actor = this.actor(actorId), parsed = slotPublishSchema.safeParse(input);
    if (!parsed.success) throw new AppError("VALIDATION_ERROR", "Supply an ISO start instant with an explicit timezone.", 422, { startsAt: ["Use an ISO timestamp with Z or an explicit offset."] });
    const startsAt = new Date(parsed.data.startsAt);
    const saved = await this.available(() => this.repository.publish(actor, startsAt, () => {
      const now = this.clock();
      if (startsAt <= now || startsAt > publicationLimit(now)) throw new AppError("VALIDATION_ERROR", "Choose a future start within six months.", 422, { startsAt: ["Choose a strictly future start no more than six UTC calendar months ahead."] });
      return now;
    }, LEAD));
    if (!saved) throw new ForbiddenError();
    const dto = this.ownerDto(saved);
    try { this.emit("availability.slot.published"); } catch {
      // Notification observers are best effort; the publication transaction already committed.
      return dto;
    }
    return dto;
  }
  async remove(actorId: string | null, input: unknown) {
    const actor = this.actor(actorId), parsed = slotIdSchema.safeParse(input);
    if (!parsed.success) throw new NotFoundError();
    const result = await this.available(() => this.repository.remove(actor, parsed.data, this.clock, LEAD));
    if (result === "forbidden") throw new ForbiddenError();
    if (result === "missing") throw new NotFoundError();
    return this.ownerDto(result);
  }
  async getPublicBySlug(input: unknown, page: unknown = {}): Promise<PublicAvailability> {
    const parsed = mentorSlugSchema.safeParse(input); if (!parsed.success) throw new NotFoundError();
    const query = this.query(page);
    const slots = await this.available(() => this.repository.publicBySlug(parsed.data, query, this.clock, LEAD));
    if (!slots) throw new NotFoundError();
    return this.publicDto(slots);
  }
}
