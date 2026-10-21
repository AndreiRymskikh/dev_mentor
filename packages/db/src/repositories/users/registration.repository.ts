import { randomUUID } from "node:crypto";
import { LockMode, UniqueConstraintViolationException } from "@mikro-orm/postgresql";
import { database } from "../../runtime";
import { User } from "../../entities/users/user.entity";
import { UserRole } from "../../entities/users/user-role.entity";
import { Credential } from "../../entities/credentials/credential.entity";
import { ActionToken } from "../../entities/tokens/action-token.entity";

export interface RegistrationRecord {
  normalizedEmail: string;
  displayName: string;
  passwordHash: string;
  verificationDigest: string;
  verificationExpiresAt: Date;
}

/** No identity linking: a collision leaves all existing data untouched. */
export class RegistrationRepository {
  constructor(private readonly runtime = database) {}

  async create(input: RegistrationRecord): Promise<string | null> {
    try {
      return await this.runtime.transaction(async (em) => {
        const id = randomUUID();
        const now = new Date();
        em.create(User, { id, normalizedEmail: input.normalizedEmail, displayName: input.displayName, createdAt: now, updatedAt: now });
        em.create(UserRole, { userId: id, role: "developer" });
        em.create(Credential, { userId: id, passwordHash: input.passwordHash, passwordChangedAt: now });
        em.create(ActionToken, { id: randomUUID(), userId: id, purpose: "verify-email", digest: input.verificationDigest, expiresAt: input.verificationExpiresAt });
        await em.flush();
        return id;
      });
    } catch (error: unknown) {
      if (error instanceof UniqueConstraintViolationException) return null;
      throw error;
    }
  }

  /** Serialize with future token writers; never revoke a replacement token. */
  async invalidateVerification(userId: string, digest: string): Promise<void> {
    await this.runtime.transaction(async (em) => {
      await em.execute("select set_config(?, ?, true), set_config(?, ?, true)", ["lock_timeout", "1s", "statement_timeout", "1s"]);
      await em.findOneOrFail(User, { id: userId }, { lockMode: LockMode.PESSIMISTIC_WRITE });
      await em.nativeUpdate(ActionToken, { userId, purpose: "verify-email", digest, consumedAt: null }, { consumedAt: new Date() });
    });
  }
}
