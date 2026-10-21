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
