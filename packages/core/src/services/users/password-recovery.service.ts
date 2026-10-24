import { createHash, randomBytes } from "node:crypto";
import { setTimeout as wait } from "node:timers/promises";
import { hashPassword } from "../credentials/password";
import type { PasswordRecoveryRepository } from "@devmentor/db";
import { ServiceUnavailableError, ValidationError } from "../../http/errors";
import { passwordForgotSchema, passwordResetSchema } from "../../validators/users/password-recovery.schema";
import { REGISTRATION_RESPONSE_WINDOW_MS } from "../emails/delivery-policy";
import type { EmailSender } from "../emails/email-sender.port";
import type { RateLimitService } from "../limits/rate-limit.service";

const RESET_TTL_MS = 30 * 60 * 1000;

export class PasswordRecoveryService {
  constructor(
    private readonly repository: Pick<PasswordRecoveryRepository, "issue" | "invalidate" | "eligible" | "reset">,
    private readonly limits: Pick<RateLimitService, "email">,
    private readonly email: EmailSender,
    private readonly log: { warn(event: string): void },
  ) {}

  async forgot(input: unknown, ip: string): Promise<{ message: string }> {
    const parsed = passwordForgotSchema.safeParse(input);
    if (!parsed.success) {
      const errors = parsed.error.issues.filter((issue) => issue.path[0] === "email").map((issue) => issue.message);
      throw new ValidationError("Invalid input", { email: errors });
    }
    const email = parsed.data.email;
    await this.limits.email(email, ip);
    this.email.assertConfigured();
    const started = Date.now();
    const token = randomBytes(32).toString("base64url");
    const digest = createHash("sha256").update(token).digest("hex");
    let userId: string | null;
    try {
      userId = await this.repository.issue(email, digest, new Date(Date.now() + RESET_TTL_MS));
    } catch {
      throw new ServiceUnavailableError();
    }
    if (userId !== null) {
      try {
        await this.email.send({ type: "password-reset", to: email, token });
      } catch {
        this.log.warn("emails.password_reset.delivery_failed");
        try {
          await this.repository.invalidate(userId, digest);
        } catch {
          this.log.warn("emails.password_reset.invalidation_failed");
        }
      }
    }
    const remaining = REGISTRATION_RESPONSE_WINDOW_MS - (Date.now() - started);
    if (remaining > 0) await wait(remaining);
    return { message: "If password recovery can proceed, check your email for instructions." };
  }

  async reset(input: unknown): Promise<{ message: string }> {
    const parsed = passwordResetSchema.safeParse(input);
    if (!parsed.success) {
      const errors = parsed.error.issues.filter((issue) => issue.path[0] === "newPassword").map((issue) => issue.message);
      throw new ValidationError("Invalid or expired reset token or password", { newPassword: errors });
    }
    const digest = createHash("sha256").update(parsed.data.token).digest("hex");
    try {
      if (!await this.repository.eligible(digest)) throw new ValidationError("Invalid or expired reset token or password");
      const passwordHash = await hashPassword(parsed.data.newPassword);
      if (!await this.repository.reset(digest, passwordHash)) throw new ValidationError("Invalid or expired reset token or password");
    } catch (error) {
      if (error instanceof ValidationError) throw error;
      throw new ServiceUnavailableError();
    }
    return { message: "Password reset. Log in with your new password." };
  }
}
