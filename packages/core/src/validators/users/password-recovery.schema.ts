import { z } from "zod";
import { passwordSchema } from "./register.schema";
import { verificationRequestSchema, verificationConfirmSchema } from "./verification.schema";

export const passwordForgotSchema = verificationRequestSchema;
export const passwordResetSchema = z.strictObject({
  token: verificationConfirmSchema.shape.token,
  newPassword: passwordSchema,
});
