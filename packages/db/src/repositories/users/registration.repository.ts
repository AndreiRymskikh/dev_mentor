import { randomUUID } from "node:crypto";
import { UniqueConstraintViolationException } from "@mikro-orm/postgresql";
import { database } from "../../runtime";
import { User } from "../../entities/users/user.entity";
import { UserRole } from "../../entities/users/user-role.entity";
import { Credential } from "../../entities/credentials/credential.entity";

export interface RegistrationRecord {
  normalizedEmail: string;
  displayName: string;
  passwordHash: string;
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
        await em.flush();
        return id;
      });
    } catch (error: unknown) {
      if (error instanceof UniqueConstraintViolationException) return null;
      throw error;
    }
  }
}
