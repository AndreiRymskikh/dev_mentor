import { LockMode } from "@mikro-orm/postgresql";
import { database } from "../../runtime";
import { User } from "../../entities/users/user.entity";
import { UserRole } from "../../entities/users/user-role.entity";
import type { Role } from "./session.repository";

export type RoleChangeResult = { status: "ok"; roles: readonly Role[] } | { status: "forbidden" } | { status: "not-found" } | { status: "conflict" };
export interface DesiredRoles { mentor: boolean; administrator: boolean }
// All administrator writers take this transaction-scoped lock BEFORE User locks.
export const ADMIN_MEMBERSHIP_LOCK = 724501;
export class RolesRepository {
  constructor(private readonly runtime = database) {}
  async enrollMentor(actorId: string): Promise<RoleChangeResult> {
    return this.runtime.transaction(async em => {
      const actor = await em.findOne(User, { id: actorId }, { lockMode: LockMode.PESSIMISTIC_WRITE });
      if (!actor?.emailVerifiedAt || !await em.findOne(UserRole, { userId: actorId, role: "developer" })) return { status: "forbidden" };
      await em.upsert(UserRole, { userId: actorId, role: "mentor" });
      return { status: "ok", roles: (await em.find(UserRole, { userId: actorId })).map(row => row.role) };
    });
  }
  async setRoles(actorId: string, targetId: string, desired: DesiredRoles): Promise<RoleChangeResult> {
    return this.runtime.transaction(async em => {
      await em.execute("select pg_advisory_xact_lock(?)", [ADMIN_MEMBERSHIP_LOCK]);
      const users = await em.find(User, { id: { $in: [actorId, targetId] } }, { orderBy: { id: "asc" }, lockMode: LockMode.PESSIMISTIC_WRITE });
      const actor = users.find(user => user.id === actorId);
      if (!actor?.emailVerifiedAt || !await em.findOne(UserRole, { userId: actorId, role: "administrator" })) return { status: "forbidden" };
      const target = users.find(user => user.id === targetId);
      if (!target) return { status: "not-found" };
      if (!await em.findOne(UserRole, { userId: targetId, role: "developer" })) return { status: "forbidden" };
      const wasAdmin = await em.findOne(UserRole, { userId: targetId, role: "administrator" });
      if (wasAdmin && !desired.administrator && target.emailVerifiedAt) {
        const [row] = await em.execute<{ count: number }[]>("select count(*)::int as count from user_roles r join users u on u.id = r.user_id where r.role = ? and u.email_verified_at is not null", ["administrator"]);
        if (row.count <= 1) return { status: "conflict" };
      }
      for (const role of ["mentor", "administrator"] as const) {
        if (desired[role]) await em.upsert(UserRole, { userId: targetId, role });
        else await em.nativeDelete(UserRole, { userId: targetId, role });
      }
      return { status: "ok", roles: (await em.find(UserRole, { userId: targetId })).map(row => row.role) };
    });
  }
  async bootstrap(userId: string): Promise<RoleChangeResult> {
    return this.runtime.transaction(async em => {
      await em.execute("select pg_advisory_xact_lock(?)", [ADMIN_MEMBERSHIP_LOCK]);
      const user = await em.findOne(User, { id: userId }, { lockMode: LockMode.PESSIMISTIC_WRITE });
      if (!user) return { status: "not-found" };
      if (!user.emailVerifiedAt || !await em.findOne(UserRole, { userId, role: "developer" })) return { status: "forbidden" };
      const existing = await em.find(UserRole, { role: "administrator" });
      if (existing.length && !existing.some(row => row.userId === userId)) return { status: "conflict" };
      await em.upsert(UserRole, { userId, role: "administrator" });
      return { status: "ok", roles: (await em.find(UserRole, { userId })).map(row => row.role) };
    });
  }
}
