import { randomUUID } from "node:crypto";
import { LockMode } from "@mikro-orm/postgresql";
import { database } from "../../runtime";
import { User } from "../../entities/users/user.entity";
import { Credential } from "../../entities/credentials/credential.entity";
import { ActionToken } from "../../entities/tokens/action-token.entity";

/** User locks serialize issuance, delivery cleanup and consumption. */
export class VerificationRepository {
  constructor(private readonly runtime = database) {}

  async issue(email: string, digest: string, expiresAt: Date): Promise<string | null> {
    return this.runtime.transaction(async (em) => {
      const user = await em.findOne(User, { normalizedEmail: email }, { lockMode: LockMode.PESSIMISTIC_WRITE });
      if (!user || user.emailVerifiedAt || !await em.findOne(Credential, { userId: user.id })) return null;
      await em.nativeUpdate(ActionToken, { userId: user.id, purpose: "verify-email", consumedAt: null }, { consumedAt: new Date() });
      em.create(ActionToken, { id: randomUUID(), userId: user.id, purpose: "verify-email", digest, expiresAt });
      await em.flush();
      return user.id;
    });
  }

  async invalidate(userId: string, digest: string): Promise<void> {
    await this.runtime.transaction(async (em) => {
      await em.execute("select set_config(?, ?, true), set_config(?, ?, true)", ["lock_timeout", "1s", "statement_timeout", "1s"]);
      await em.findOneOrFail(User, { id: userId }, { lockMode: LockMode.PESSIMISTIC_WRITE });
      await em.nativeUpdate(ActionToken, { userId, purpose: "verify-email", digest, consumedAt: null }, { consumedAt: new Date() });
    });
  }

  async confirm(digest: string): Promise<boolean> {
    return this.runtime.transaction(async (em) => {
      const candidate = await em.findOne(ActionToken, { digest, purpose: "verify-email" });
      if (!candidate) return false;
      const user = await em.findOneOrFail(User, { id: candidate.userId }, { lockMode: LockMode.PESSIMISTIC_WRITE });
      const now = new Date();
      const consumed = await em.nativeUpdate(ActionToken, { digest, userId: user.id, purpose: "verify-email", consumedAt: null, expiresAt: { $gt: now } }, { consumedAt: now });
      if (consumed !== 1) return false;
      await em.nativeUpdate(User, { id: user.id }, { emailVerifiedAt: now, updatedAt: now });
      return true;
    });
  }
}
