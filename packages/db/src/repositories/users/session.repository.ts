import { LockMode } from "@mikro-orm/postgresql";
import { database } from "../../runtime";
import { User } from "../../entities/users/user.entity";
import { UserRole } from "../../entities/users/user-role.entity";
import { Credential } from "../../entities/credentials/credential.entity";
import { AuthSession } from "../../entities/sessions/auth-session.entity";

export type Role = "developer" | "mentor" | "administrator";
export interface Principal { id: string; displayName: string; roles: readonly Role[] }
export class SessionRepository {
  constructor(private readonly runtime = database) {}
  async credentials(email: string): Promise<{ userId: string; passwordHash: string } | null> {
    return this.runtime.withEntityManager(async (em) => {
      const user = await em.findOne(User, { normalizedEmail: email });
      if (!user) return null;
      const credential = await em.findOne(Credential, { userId: user.id });
      return credential ? { userId: user.id, passwordHash: credential.passwordHash } : null;
    });
  }
  async create(userId: string, passwordHash: string, sessionId: string, expiresAt: Date): Promise<Principal | null> {
    return this.runtime.transaction(async (em) => {
      const user = await em.findOne(User, { id: userId }, { lockMode: LockMode.PESSIMISTIC_WRITE });
      const credential = await em.findOne(Credential, { userId });
      if (!user?.emailVerifiedAt || credential?.passwordHash !== passwordHash) return null;
      const roles = (await em.find(UserRole, { userId })).map(({ role }) => role);
      em.create(AuthSession, { id: sessionId, userId, expiresAt });
      await em.flush();
      return { id: user.id, displayName: user.displayName, roles };
    });
  }
  async resolve(userId: string, sessionId: string): Promise<Principal | null> {
    return this.runtime.withEntityManager(async (em) => {
      const session = await em.findOne(AuthSession, { id: sessionId, userId, revokedAt: null, expiresAt: { $gt: new Date() } });
      if (!session) return null;
      const user = await em.findOne(User, { id: userId, emailVerifiedAt: { $ne: null } });
      if (!user) return null;
      const roles = (await em.find(UserRole, { userId })).map(({ role }) => role);
      return { id: user.id, displayName: user.displayName, roles };
    });
  }
  async revoke(userId: string, sessionId: string): Promise<void> {
    await this.runtime.transaction(async (em) => {
      await em.nativeUpdate(AuthSession, { id: sessionId, userId, revokedAt: null }, { revokedAt: new Date() });
    });
  }
}
