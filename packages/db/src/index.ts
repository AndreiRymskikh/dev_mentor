export type EntityId = string;

export { databaseOptions } from "./config";
export { createDatabaseRuntime, database } from "./runtime";

export interface Repository<T extends { id: EntityId }> {
  findById(id: EntityId): Promise<T | null>;
}

export { User } from "./entities/users/user.entity";
export { UserRole } from "./entities/users/user-role.entity";
export { Credential } from "./entities/credentials/credential.entity";
export { AuthSession } from "./entities/sessions/auth-session.entity";
export { ActionToken } from "./entities/tokens/action-token.entity";
export { RateLimitBucket } from "./entities/limits/rate-limit-bucket.entity";
export { RegistrationRepository, type RegistrationRecord } from "./repositories/users/registration.repository";
export { RateLimitRepository, type RateLimitRequest, type RateLimitResult } from "./repositories/limits/rate-limit.repository";
export { VerificationRepository } from "./repositories/users/verification.repository";
export { SessionRepository, type Principal, type Role } from "./repositories/users/session.repository";
export { PasswordRecoveryRepository } from "./repositories/users/password-recovery.repository";

export { RolesRepository, ADMIN_MEMBERSHIP_LOCK, type RoleChangeResult, type DesiredRoles } from "./repositories/users/roles.repository";

export { AdminUsersRepository, type AdminUserDto, type AdminUsersPage, type AdminListQuery } from "./repositories/users/admin-users.repository";

export { AuthMaintenanceRepository, type AuthMaintenanceCounts } from "./repositories/maintenance/auth-maintenance.repository";

export { Invitation } from "./entities/invitations/invitation.entity";
export { MentorProfile } from "./entities/mentors/mentor-profile.entity";

export { InvitationRepository, type InvitationRecord, type InvitationResult } from "./repositories/invitations/invitation.repository";
