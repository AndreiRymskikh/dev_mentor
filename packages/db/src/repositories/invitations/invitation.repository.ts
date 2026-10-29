import { LockMode, UniqueConstraintViolationException } from "@mikro-orm/postgresql";
import { database } from "../../runtime";
import { Invitation } from "../../entities/invitations/invitation.entity";
import { MentorProfile } from "../../entities/mentors/mentor-profile.entity";
import { User } from "../../entities/users/user.entity";
import { UserRole } from "../../entities/users/user-role.entity";

export interface InvitationRecord { id: string; email: string; tokenHash: string; stackTags: string[]; createdAt: Date; expiresAt: Date }
export type InvitationResult = "ok" | "not-found" | "forbidden" | "conflict";
export class InvitationRepository {
  constructor(private readonly runtime = database) {}
  async create(input: InvitationRecord): Promise<InvitationResult> {
    try {
      return await this.runtime.transaction(async em => {
        const user = await em.findOne(User, { normalizedEmail: input.email }, { lockMode: LockMode.PESSIMISTIC_WRITE });
        if (user && await em.findOne(UserRole, { userId: user.id, role: "mentor" })) return "conflict";
        em.create(Invitation, input);
        await em.flush();
        return "ok";
      });
    } catch (error) {
      if (error instanceof UniqueConstraintViolationException) return "conflict";
      throw error;
    }
  }
  async lookup(tokenHash: string, now: Date) {
    return this.runtime.withEntityManager(async em => {
      const row = await em.findOne(Invitation, { tokenHash, acceptedAt: null, revokedAt: null, expiresAt: { $gt: now } });
      return row ? { email: row.email, stackTags: row.stackTags, expiresAt: row.expiresAt.toISOString() } : null;
    });
  }
  async accept(userId: string, tokenHash: string, now: Date, dueAt: Date): Promise<InvitationResult> {
    return this.runtime.transaction(async em => {
      const user = await em.findOne(User, { id: userId }, { lockMode: LockMode.PESSIMISTIC_WRITE });
      const invitation = await em.findOne(Invitation, { tokenHash }, { lockMode: LockMode.PESSIMISTIC_WRITE });
      if (!invitation || invitation.acceptedAt || invitation.revokedAt || invitation.expiresAt <= now) return "not-found";
      if (!user?.emailVerifiedAt || user.normalizedEmail !== invitation.email || !await em.findOne(UserRole, { userId, role: "developer" })) return "forbidden";
      let profile = await em.findOne(MentorProfile, { userId }, { lockMode: LockMode.PESSIMISTIC_WRITE });
      if (!profile) profile = em.create(MentorProfile, { userId });
      if (!profile.initialPublishDueAt) profile.initialPublishDueAt = dueAt;
      await em.upsert(UserRole, { userId, role: "mentor" });
      invitation.acceptedAt = now;
      invitation.acceptedById = userId;
      invitation.publishDueAt = dueAt;
      await em.flush();
      return "ok";
    });
  }
  async change(id: string, now: Date, rotation?: { tokenHash: string; expiresAt: Date }): Promise<InvitationResult> {
    return this.runtime.transaction(async em => {
      const invitation = await em.findOne(Invitation, { id }, { lockMode: LockMode.PESSIMISTIC_WRITE });
      if (!invitation || invitation.acceptedAt || invitation.revokedAt) return "not-found";
      if (rotation) { invitation.tokenHash = rotation.tokenHash; invitation.expiresAt = rotation.expiresAt; }
      else invitation.revokedAt = now;
      await em.flush();
      return "ok";
    });
  }
  async identity(userId: string) {
    return this.runtime.withEntityManager(async em => {
      const user = await em.findOne(User, { id: userId, emailVerifiedAt: { $ne: null } });
      return user?.normalizedEmail ?? null;
    });
  }
  async onboarding(userId: string) {
    return this.runtime.withEntityManager(async em => {
      const user = await em.findOne(User, { id: userId });
      if (!user?.emailVerifiedAt || !await em.findOne(UserRole, { userId, role: "mentor" })) return null;
      const profile = await em.findOne(MentorProfile, { userId });
      return { initialPublishDueAt: profile?.initialPublishDueAt?.toISOString() ?? null };
    });
  }
}
