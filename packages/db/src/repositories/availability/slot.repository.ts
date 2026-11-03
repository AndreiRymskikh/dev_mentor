import { LockMode, UniqueConstraintViolationException, type EntityManager, type InferEntity, type FilterQuery } from "@mikro-orm/postgresql";
import { randomUUID } from "node:crypto";
import { database } from "../../runtime";
import { User } from "../../entities/users/user.entity";
import { UserRole } from "../../entities/users/user-role.entity";
import { MentorProfile } from "../../entities/mentors/mentor-profile.entity";
import { Slot } from "../../entities/availability/slot.entity";
export interface SlotRecord { id: string; startsAt: Date }
export interface SlotQuery { limit: number; view: "future" | "all"; after?: { startsAt: string; id: string } }
export interface AvailabilityRecord {
  slots: SlotRecord[]; lastPublishedAvailabilityAt: Date | null; now: Date;
  availabilityComplete: boolean; refreshAt: Date | null; next: SlotRecord | null;
}
export class DuplicateSlotError extends Error {}
export class SlotRepository {
  constructor(private readonly runtime = database) {}
  private async owned(em: EntityManager, userId: string) {
    const user = await em.findOne(User, { id: userId }, { lockMode: LockMode.PESSIMISTIC_WRITE });
    return Boolean(user?.emailVerifiedAt && await em.findOne(UserRole, { userId, role: "mentor" }));
  }
  private async snapshot(em: EntityManager, userId: string, query: SlotQuery, now: Date, leadMs: number): Promise<AvailabilityRecord> {
    const profile = await em.findOne(MentorProfile, { userId });
    const active = { mentorProfileId: userId, removedAt: null };
    const where: FilterQuery<InferEntity<typeof Slot>> = { ...active, ...(query.view === "future" ? { startsAt: { $gt: now } } : {}) };
    if (query.after) where.$and = [{ $or: [{ startsAt: { $gt: new Date(query.after.startsAt) } }, { startsAt: new Date(query.after.startsAt), id: { $gt: query.after.id } }] }];
    const rows = await em.find(Slot, where, { orderBy: { startsAt: "asc", id: "asc" }, limit: query.limit + 1 });
    // These global boundaries include off-page starts without loading their history.
    const future = await em.findOne(Slot, { ...active, startsAt: { $gt: now } }, { orderBy: { startsAt: "asc" } });
    const eligible = await em.findOne(Slot, { ...active, startsAt: { $gte: new Date(now.getTime() + leadMs) } }, { orderBy: { startsAt: "asc" } });
    const boundaries = [future?.startsAt.getTime(), eligible ? eligible.startsAt.getTime() - leadMs + 1 : undefined].filter((value): value is number => value !== undefined);
    const slots = rows.slice(0, query.limit).map(({id, startsAt}) => ({id, startsAt}));
    return { slots, now, availabilityComplete: Boolean(eligible), refreshAt: boundaries.length ? new Date(Math.min(...boundaries)) : null,
      next: rows.length > query.limit ? slots[slots.length - 1] : null, lastPublishedAvailabilityAt: profile?.lastPublishedAvailabilityAt ?? null };
  }
  async read(userId: string, query: SlotQuery, clock: () => Date, leadMs: number): Promise<AvailabilityRecord | null> {
    return this.runtime.transaction(async em => {
      if (!await this.owned(em, userId)) return null;
      return this.snapshot(em, userId, query, clock(), leadMs);
    });
  }
  async publish(userId: string, startsAt: Date, validate: () => Date, leadMs: number): Promise<AvailabilityRecord | null> {
    try {
      return await this.runtime.transaction(async em => {
        if (!await this.owned(em, userId)) return null;
        const now = validate();
        let profile = await em.findOne(MentorProfile, { userId }, { lockMode: LockMode.PESSIMISTIC_WRITE });
        if (!profile) profile = em.create(MentorProfile, { userId, stackTags: [] });
        em.create(Slot, { id: randomUUID(), mentorProfileId: userId, startsAt });
        // Preserve the most recent publication even if the wall clock moves backward.
        if (!profile.lastPublishedAvailabilityAt || now > profile.lastPublishedAvailabilityAt) profile.lastPublishedAvailabilityAt = now;
        await em.flush();
        return this.snapshot(em, userId, { limit: 50, view: "future" }, now, leadMs);
      });
    } catch (error) {
      if (error instanceof UniqueConstraintViolationException && error.message.includes("slots_active_start_unique")) throw new DuplicateSlotError();
      throw error;
    }
  }
  async remove(userId: string, slotId: string, clock: () => Date, leadMs: number): Promise<AvailabilityRecord | "missing" | "forbidden"> {
    return this.runtime.transaction(async em => {
      if (!await this.owned(em, userId)) return "forbidden";
      const slot = await em.findOne(Slot, { id: slotId, mentorProfileId: userId, removedAt: null }, { lockMode: LockMode.PESSIMISTIC_WRITE });
      if (!slot) return "missing";
      const now = clock();
      slot.removedAt = now;
      await em.flush();
      return this.snapshot(em, userId, { limit: 50, view: "future" }, now, leadMs);
    });
  }
  async publicBySlug(slug: string, query: SlotQuery, clock: () => Date, leadMs: number): Promise<AvailabilityRecord | null> {
    return this.runtime.transaction(async em => {
      const candidate = await em.findOne(MentorProfile, { slug });
      if (!candidate || !await this.owned(em, candidate.userId)) return null;
      // Re-read after the user lock: unpublish and role changes use the same lock order.
      const profile = await em.findOne(MentorProfile, { userId: candidate.userId, slug, publishedAt: { $ne: null } }, { refresh: true });
      if (!profile) return null;
      return this.snapshot(em, profile.userId, { ...query, view: "future" }, clock(), leadMs);
    });
  }
}
