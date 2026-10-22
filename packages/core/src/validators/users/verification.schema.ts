import { z } from "zod";

export const verificationRequestSchema = z.strictObject({ email: z.string().trim().toLowerCase().pipe(z.email().max(254)) });
export const verificationConfirmSchema = z.strictObject({ token: z.string().regex(/^[A-Za-z0-9_-]{43}$/) });
