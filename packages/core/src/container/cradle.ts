import type { SessionRepository } from "@devmentor/db";
import type { SessionService } from "../services/users/session.service";
import type { SessionJwt } from "../services/sessions/jwt";
import type { VerificationRepository } from "@devmentor/db";
import type { VerificationService } from "../services/users/verification.service";
import type { Logger } from "pino";
import type { RegistrationRepository, RateLimitRepository } from "@devmentor/db";
import type { RegistrationService } from "../services/users/registration.service";
import type { RateLimitService } from "../services/limits/rate-limit.service";
import type { EmailSender } from "../services/emails/email-sender.port";
export interface Cradle {
  sessionRepository: SessionRepository;
  sessionService: SessionService;
  sessionJwt: SessionJwt;
  verificationRepository: VerificationRepository;
  verificationService: VerificationService;
  logger: Logger;
  requestId: string;
  registrationRepository: RegistrationRepository;
  rateLimitRepository: RateLimitRepository;
  registrationService: RegistrationService;
  rateLimitService: RateLimitService;
  emailSender: EmailSender;
}
