import { randomUUID } from "node:crypto";
import { LockMode } from "@mikro-orm/postgresql";
import { database } from "../../runtime";
import { User } from "../../entities/users/user.entity";
import { Credential } from "../../entities/credentials/credential.entity";
import { ActionToken } from "../../entities/tokens/action-token.entity";
import { AuthSession } from "../../entities/sessions/auth-session.entity";

export class PasswordRecoveryRepository {
  constructor(private readonly runtime = database) {}

  async issue(email: string, digest: string, expiresAt: Date): Promise<string | null> {
    return this.runtime.transaction(async (em) => {
      const user = await em.findOne(User, { normalizedEmail: email }, { lockMode: LockMode.PESSIMISTIC_WRITE });
      if (!user || !await em.findOne(Credential, { userId: user.id })) return null;
      await em.nativeUpdate(ActionToken, { userId: user.id, purpose: "reset-password", consumedAt: null }, { consumedAt: new Date() });
      em.create(ActionToken, { id: randomUUID(), userId: user.id, purpose: "reset-password", digest, expiresAt });
      await em.flush();
      return user.id;
    });
  }

  async invalidate(userId: string, digest: string): Promise<void> {
    await this.runtime.transaction(async (em) => {
      await em.execute("select set_config(?, ?, true), set_config(?, ?, true)", ["lock_timeout", "1s", "statement_timeout", "1s"]);
      await em.findOneOrFail(User, { id: userId }, { lockMode: LockMode.PESSIMISTIC_WRITE });
      await em.nativeUpdate(ActionToken, { userId, digest, purpose: "reset-password", consumedAt: null }, { consumedAt: new Date() });
    });
  }

  /** Reject random tokens before paying the bcrypt cost; the mutation rechecks everything. */
  async eligible(digest: string): Promise<boolean> {
    return this.runtime.withEntityManager(async (em) => {
      const token = await em.findOne(ActionToken, { digest, purpose: "reset-password", consumedAt: null, expiresAt: { $gt: new Date() } });
      return token !== null && await em.findOne(Credential, { userId: token.userId }) !== null;
    });
  }

  async reset(digest: string, passwordHash: string): Promise<boolean> {
    return this.runtime.transaction(async (em) => {
      const candidate = await em.findOne(ActionToken, { digest, purpose: "reset-password" });
      if (!candidate) return false;
      // Session creation shares this lock and rechecks the password hash after acquiring it.
      const user = await em.findOneOrFail(User, { id: candidate.userId }, { lockMode: LockMode.PESSIMISTIC_WRITE });
      if (!await em.findOne(Credential, { userId: user.id })) return false;
      const now = new Date();
      const consumed = await em.nativeUpdate(ActionToken, { digest, userId: user.id, purpose: "reset-password", consumedAt: null, expiresAt: { $gt: now } }, { consumedAt: now });
      if (consumed !== 1) return false;
      await em.nativeUpdate(Credential, { userId: user.id }, { passwordHash, passwordChangedAt: now });
      await em.nativeUpdate(User, { id: user.id }, { updatedAt: now });
      await em.nativeUpdate(AuthSession, { userId: user.id, revokedAt: null }, { revokedAt: now });
      return true;
    });
  }
}
