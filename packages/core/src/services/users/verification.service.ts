import { createHash, randomBytes } from "node:crypto";
import { setTimeout as wait } from "node:timers/promises";
import type { VerificationRepository } from "@devmentor/db";
import { ServiceUnavailableError, ValidationError } from "../../http/errors";
import { verificationConfirmSchema, verificationRequestSchema } from "../../validators/users/verification.schema";
import { REGISTRATION_RESPONSE_WINDOW_MS } from "../emails/delivery-policy";
import type { EmailSender } from "../emails/email-sender.port";
import type { RateLimitService } from "../limits/rate-limit.service";

const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;

export class VerificationService {
  constructor(private readonly repository: Pick<VerificationRepository, "issue" | "invalidate" | "confirm">, private readonly limits: Pick<RateLimitService, "email">, private readonly email: EmailSender, private readonly log: { warn(event: string): void }) {}

  async request(input: unknown, ip: string): Promise<{ message: string }> {
    const parsed = verificationRequestSchema.safeParse(input);
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
    try { userId = await this.repository.issue(email, digest, new Date(Date.now() + VERIFICATION_TTL_MS)); }
    catch { throw new ServiceUnavailableError(); }
    if (userId !== null) {
      try { await this.email.send({ type: "verification", to: email, token }); }
      catch {
        this.log.warn("emails.verification.delivery_failed");
        try { await this.repository.invalidate(userId, digest); }
        catch { this.log.warn("emails.verification.invalidation_failed"); }
      }
    }
    const remaining = REGISTRATION_RESPONSE_WINDOW_MS - (Date.now() - started);
    if (remaining > 0) await wait(remaining);
    return { message: "If verification can proceed, check your email for instructions." };
  }

  async confirm(input: unknown): Promise<{ message: string }> {
    const parsed = verificationConfirmSchema.safeParse(input);
    if (!parsed.success) throw new ValidationError("Invalid or expired verification token");
    let confirmed: boolean;
    try { confirmed = await this.repository.confirm(createHash("sha256").update(parsed.data.token).digest("hex")); }
    catch { throw new ServiceUnavailableError(); }
    if (!confirmed) throw new ValidationError("Invalid or expired verification token");
    return { message: "Email verified. You may now log in." };
  }
}
