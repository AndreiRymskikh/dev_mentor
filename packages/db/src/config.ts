import { Migration202610260002 } from "./migrations/Migration202610260002";
import { Migration202610260001 } from "./migrations/Migration202610260001";
import { Invitation } from "./entities/invitations/invitation.entity";
import { MentorProfile } from "./entities/mentors/mentor-profile.entity";
import { Migrator } from "@mikro-orm/migrations";
import { Migration202610210001 } from "./migrations/Migration202610210001";
import { User } from "./entities/users/user.entity";
import { UserRole } from "./entities/users/user-role.entity";
import { Credential } from "./entities/credentials/credential.entity";
import { AuthSession } from "./entities/sessions/auth-session.entity";
import { ActionToken } from "./entities/tokens/action-token.entity";
import { RateLimitBucket } from "./entities/limits/rate-limit-bucket.entity";
import { defineConfig } from "@mikro-orm/postgresql";

/** Read secrets only when persistence is requested, never during module loading. */
export function databaseOptions() {
  const clientUrl = process.env.DATABASE_URL;
  if (!clientUrl) throw new Error("DATABASE_URL is required for database operations");
  let url: URL;
  try {
    url = new URL(clientUrl);
  } catch {
    throw new Error("DATABASE_URL must be a PostgreSQL connection URL");
  }
  if (!["postgres:", "postgresql:"].includes(url.protocol) || !url.hostname || url.pathname.length < 2) {
    throw new Error("DATABASE_URL must be a PostgreSQL connection URL");
  }
  return defineConfig({
    clientUrl,
    entities: [User, UserRole, Credential, AuthSession, ActionToken, RateLimitBucket, Invitation, MentorProfile],
    extensions: [Migrator],
    migrations: { migrationsList: [Migration202610210001, Migration202610260001, Migration202610260002], snapshot: false, transactional: true, allOrNothing: true },
    discovery: { warnWhenNoEntities: false },
    allowGlobalContext: false,
    debug: false,
    logger: () => undefined,
    pool: { min: 0, max: 10 },
  });
}
