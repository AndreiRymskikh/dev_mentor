import { createHash, randomBytes } from "node:crypto";
import type { RegistrationRepository } from "@devmentor/db";
import { registerSchema } from "../../validators/users/register.schema";
import { ServiceUnavailableError, ValidationError } from "../../http/errors";
import { hashPassword } from "../credentials/password";
import type { RateLimitService } from "../limits/rate-limit.service";
import type { EmailSender } from "../emails/email-sender.port";

const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;

export class RegistrationService {
  constructor(
    private readonly repository: Pick<RegistrationRepository, "create" | "invalidateVerification">,
    private readonly limits: Pick<RateLimitService, "registration" | "email">,
    private readonly email: EmailSender,
    private readonly log: { warn(event: string): void },
  ) {}

  async register(input: unknown, ip: string): Promise<{ message: string }> {
    const parsed = registerSchema.safeParse(input);
    if (!parsed.success) {
      const fieldErrors: Record<string, string[]> = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (field === "email" || field === "password" || field === "displayName") {
          fieldErrors[field] = [...(fieldErrors[field] ?? []), issue.message];
        }
      }
      throw new ValidationError("Invalid input", fieldErrors);
    }
    const { email, displayName, password } = parsed.data;
    await this.limits.registration(ip);
    await this.limits.email(email, ip);
    this.email.assertConfigured();
    const passwordHash = await hashPassword(password);
    const token = randomBytes(32).toString("base64url");
    const digest = createHash("sha256").update(token).digest("hex");
    let userId: string | null;
    try {
      userId = await this.repository.create({ normalizedEmail: email, displayName, passwordHash, verificationDigest: digest, verificationExpiresAt: new Date(Date.now() + VERIFICATION_TTL_MS) });
    } catch {
      throw new ServiceUnavailableError();
    }
    if (userId !== null) {
      try {
        await this.email.send({ type: "verification", to: email, token });
      } catch {
        this.log.warn("emails.verification.delivery_failed");
        try {
          await this.repository.invalidateVerification(userId, digest);
        } catch {
          // A storage outage cannot guarantee revocation; no retry send occurs here.
          this.log.warn("emails.verification.invalidation_failed");
        }
      }
    }
    return { message: "If registration can proceed, check your email for verification instructions." };
  }
}
