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
    entities: [],
    discovery: { warnWhenNoEntities: false },
    allowGlobalContext: false,
    debug: false,
    logger: () => undefined,
    pool: { min: 0, max: 10 },
  });
}
