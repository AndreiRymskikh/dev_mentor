import { z } from "zod";
export const loginSchema = z.strictObject({
  email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
  password: z.string().max(1024),
});
export const logoutSchema = z.strictObject({});
