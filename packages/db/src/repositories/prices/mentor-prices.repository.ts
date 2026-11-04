import { LockMode, type EntityManager } from "@mikro-orm/postgresql";
import { database } from "../../runtime";
import { User } from "../../entities/users/user.entity";
import { UserRole } from "../../entities/users/user-role.entity";
import { MentorProfile } from "../../entities/mentors/mentor-profile.entity";
import { Slot } from "../../entities/availability/slot.entity";
export interface OfferRecord {
  price25Cents: number | null; price50Cents: number | null;
  published: boolean; availability: boolean; now: Date; refreshAt: Date | null;
}
export class MentorPricesRepository {
  constructor(private readonly runtime = database) {}
  private async owned(em: EntityManager, userId: string) {
    const user = await em.findOne(User, {id: userId}, {lockMode: LockMode.PESSIMISTIC_WRITE});
    return Boolean(user?.emailVerifiedAt && await em.findOne(UserRole, {userId, role: "mentor"}));
  }
  private async snapshot(em: EntityManager, userId: string, clock: () => Date): Promise<OfferRecord> {
    const profile = await em.findOne(MentorProfile, {userId}, {refresh: true}), now = clock();
    const eligible = await em.findOne(Slot, {mentorProfileId: userId, removedAt: null, startsAt: {$gte: new Date(now.getTime() + 7200000)}}, {orderBy: {startsAt: "asc"}});
    return {price25Cents: profile?.price25Cents ?? null, price50Cents: profile?.price50Cents ?? null,
      published: Boolean(profile?.publishedAt), availability: Boolean(eligible), now,
      refreshAt: eligible ? new Date(eligible.startsAt.getTime() - 7200000 + 1) : null};
  }
  async read(userId: string, clock: () => Date): Promise<OfferRecord | null> {
    return this.runtime.transaction(async em => {
      if (!await this.owned(em, userId)) return null;
      return this.snapshot(em, userId, clock);
    });
  }
  async save(userId: string, values: {price25Cents: number; price50Cents: number}, clock: () => Date): Promise<OfferRecord | null> {
    return this.runtime.transaction(async em => {
      if (!await this.owned(em, userId)) return null;
      let profile = await em.findOne(MentorProfile, {userId}, {lockMode: LockMode.PESSIMISTIC_WRITE});
      if (!profile) profile = em.create(MentorProfile, {userId, stackTags: []});
      profile.price25Cents = values.price25Cents; profile.price50Cents = values.price50Cents;
      await em.flush();
      // Capture the response before commit; a failed projection rolls back both prices.
      return this.snapshot(em, userId, clock);
    });
  }
  async publicBySlug(slug: string, clock: () => Date): Promise<OfferRecord | null> {
    return this.runtime.transaction(async em => {
      const candidate = await em.findOne(MentorProfile, {slug});
      if (!candidate || !await this.owned(em, candidate.userId)) return null;
      const profile = await em.findOne(MentorProfile, {userId: candidate.userId, slug, publishedAt: {$ne: null}}, {refresh: true});
      if (!profile) return null;
      return this.snapshot(em, profile.userId, clock);
    });
  }
}
