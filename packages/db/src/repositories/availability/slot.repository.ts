import { LockMode, UniqueConstraintViolationException, type EntityManager } from "@mikro-orm/postgresql";
import { randomUUID } from "node:crypto";
import { database } from "../../runtime";
import { User } from "../../entities/users/user.entity";
import { UserRole } from "../../entities/users/user-role.entity";
import { MentorProfile } from "../../entities/mentors/mentor-profile.entity";
import { Slot } from "../../entities/availability/slot.entity";
export interface SlotRecord { id: string; startsAt: Date }
export interface AvailabilityRecord { slots: SlotRecord[]; lastPublishedAvailabilityAt: Date | null }
export class DuplicateSlotError extends Error {}
export class SlotRepository {
  constructor(private readonly runtime = database) {}
  private async owned(em: EntityManager, userId: string) {
    const user = await em.findOne(User, { id: userId }, { lockMode: LockMode.PESSIMISTIC_WRITE });
    return Boolean(user?.emailVerifiedAt && await em.findOne(UserRole, { userId, role: "mentor" }));
  }
  private async snapshot(em: EntityManager, userId: string): Promise<AvailabilityRecord> {
    const profile = await em.findOne(MentorProfile, { userId });
    const slots = await em.find(Slot, { mentorProfileId: userId, removedAt: null }, { orderBy: { startsAt: "asc", id: "asc" } });
    return { slots: slots.map(({id, startsAt}) => ({id, startsAt})), lastPublishedAvailabilityAt: profile?.lastPublishedAvailabilityAt ?? null };
  }
  async read(userId: string): Promise<AvailabilityRecord | null> {
    return this.runtime.transaction(async em => {
      if (!await this.owned(em, userId)) return null;
      return this.snapshot(em, userId);
    });
  }
  async publish(userId: string, startsAt: Date, validate: () => Date): Promise<boolean> {
    try {
      return await this.runtime.transaction(async em => {
        if (!await this.owned(em, userId)) return false;
        const now = validate();
        let profile = await em.findOne(MentorProfile, { userId }, { lockMode: LockMode.PESSIMISTIC_WRITE });
        if (!profile) profile = em.create(MentorProfile, { userId, stackTags: [] });
        em.create(Slot, { id: randomUUID(), mentorProfileId: userId, startsAt });
        // Preserve the most recent publication even if the wall clock moves backward.
        if (!profile.lastPublishedAvailabilityAt || now > profile.lastPublishedAvailabilityAt) profile.lastPublishedAvailabilityAt = now;
        await em.flush();
        return true;
      });
    } catch (error) {
      if (error instanceof UniqueConstraintViolationException && error.message.includes("slots_active_start_unique")) throw new DuplicateSlotError();
      throw error;
    }
  }
  async remove(userId: string, slotId: string, clock: () => Date): Promise<"removed" | "missing" | "forbidden"> {
    return this.runtime.transaction(async em => {
      if (!await this.owned(em, userId)) return "forbidden";
      const slot = await em.findOne(Slot, { id: slotId, mentorProfileId: userId, removedAt: null }, { lockMode: LockMode.PESSIMISTIC_WRITE });
      if (!slot) return "missing";
      slot.removedAt = clock();
      await em.flush();
      return "removed";
    });
  }
  async publicBySlug(slug: string): Promise<SlotRecord[] | null> {
    return this.runtime.transaction(async em => {
      const candidate = await em.findOne(MentorProfile, { slug });
      if (!candidate || !await this.owned(em, candidate.userId)) return null;
      // Re-read after the user lock: unpublish and role changes use the same lock order.
      const profile = await em.findOne(MentorProfile, { userId: candidate.userId, slug, publishedAt: { $ne: null } }, { refresh: true });
      if (!profile) return null;
      return (await this.snapshot(em, profile.userId)).slots;
    });
  }
}
