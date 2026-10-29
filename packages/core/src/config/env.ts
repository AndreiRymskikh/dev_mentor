import { z } from "zod";

const envSchema = z.object({
  INVITATION_TTL_DAYS: z.coerce.number().int().min(1).max(365).default(14),
  MENTOR_PUBLISH_WINDOW_DAYS: z.coerce.number().int().min(1).max(365).default(14),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.url().optional(),
  JWT_SECRET: z.string().min(32).optional(),
});
// Parse on demand so building the app does not require a database or auth secret.
export function readEnv(source: Record<string, string | undefined> = process.env) {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) throw new Error("Invalid server environment configuration");
  return parsed.data;
}
