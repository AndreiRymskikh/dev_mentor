import { LockMode, raw, type FilterQuery, type InferEntity } from "@mikro-orm/postgresql";
import { database } from "../../runtime";
import { User } from "../../entities/users/user.entity";
import { UserRole } from "../../entities/users/user-role.entity";
import type { Role } from "./session.repository";
export interface AdminListQuery { page: number; pageSize: number; q: string }
export interface AdminUserDto { id: string; displayName: string; email: string; emailVerifiedAt: string | null; roles: readonly Role[]; createdAt: string }
export interface AdminUsersPage { items: AdminUserDto[]; page: number; pageSize: number; total: number }
export class AdminUsersRepository {
  constructor(private readonly runtime = database) {}
  async list(actorId: string, query: AdminListQuery): Promise<AdminUsersPage | null> {
    return this.runtime.transaction(async em => {
      const actor = await em.findOne(User, { id: actorId }, { lockMode: LockMode.PESSIMISTIC_READ });
      if (!actor?.emailVerifiedAt || !await em.findOne(UserRole, { userId: actorId, role: "administrator" })) return null;
      // Fixed SQL expressions with bound values: % and _ are literal search text.
      const where: FilterQuery<InferEntity<typeof User>> = query.q ? { $or: [
        { [raw("strpos(lower(display_name), ?)", [query.q])]: { $gt: 0 } },
        { [raw("strpos(normalized_email, ?)", [query.q])]: { $gt: 0 } },
      ] } : {};
      const [users, total] = await em.findAndCount(User, where, { orderBy: { createdAt: "asc", id: "asc" }, limit: query.pageSize, offset: (query.page - 1) * query.pageSize });
      const memberships = users.length ? await em.find(UserRole, { userId: { $in: users.map(user => user.id) } }, { orderBy: { role: "asc" } }) : [];
      return { items: users.map(user => ({ id: user.id, displayName: user.displayName, email: user.normalizedEmail, emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null, roles: memberships.filter(row => row.userId === user.id).map(row => row.role), createdAt: user.createdAt.toISOString() })), page: query.page, pageSize: query.pageSize, total };
    });
  }
}
