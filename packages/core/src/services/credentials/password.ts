import { hash } from "bcryptjs";
import { passwordSchema } from "../../validators/users/register.schema";
import { ValidationError } from "../../http/errors";

export async function hashPassword(password: string): Promise<string> {
  if (!passwordSchema.safeParse(password).success) {
    throw new ValidationError("Invalid password", { password: ["Password must contain 12–72 UTF-8 bytes"] });
  }
  return hash(password, 12);
}
