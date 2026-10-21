import type { Logger } from "pino";
import type { RegistrationRepository, RateLimitRepository } from "@devmentor/db";
import type { RegistrationService } from "../services/users/registration.service";
import type { RateLimitService } from "../services/limits/rate-limit.service";
import type { EmailSender } from "../services/emails/email-sender.port";
export interface Cradle {
  logger: Logger;
  requestId: string;
  registrationRepository: RegistrationRepository;
  rateLimitRepository: RateLimitRepository;
  registrationService: RegistrationService;
  rateLimitService: RateLimitService;
  emailSender: EmailSender;
}
