import { z } from "zod";

export const passwordSchema = z.string().refine((value) => {
  const bytes = new TextEncoder().encode(value).length;
  return bytes >= 12 && bytes <= 72;
}, "Password must contain 12–72 UTF-8 bytes");

export const registerSchema = z.strictObject({
  email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
  password: passwordSchema,
  displayName: z.string().trim().min(1).max(100),
});

export type RegisterInput = z.infer<typeof registerSchema>;
