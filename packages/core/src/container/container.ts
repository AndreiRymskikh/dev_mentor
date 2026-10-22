import { PasswordRecoveryRepository } from "@devmentor/db";
import { PasswordRecoveryService } from "../services/users/password-recovery.service";
import { SessionRepository } from "@devmentor/db";
import { SessionService } from "../services/users/session.service";
import { SessionJwt } from "../services/sessions/jwt";
import { VerificationRepository } from "@devmentor/db";
import { VerificationService } from "../services/users/verification.service";
import { RegistrationRepository, RateLimitRepository } from "@devmentor/db";
import { RegistrationService } from "../services/users/registration.service";
import { RateLimitService } from "../services/limits/rate-limit.service";
import { SmtpEmailSender } from "../services/emails/adapters/smtp-email-sender";
import { randomUUID } from "node:crypto";
import { asFunction, asValue, createContainer, InjectionMode } from "awilix";
import { logger } from "../logger";
import type { Cradle } from "./cradle";

export function createAppContainer() {
  const container = createContainer<Cradle>({ injectionMode: InjectionMode.PROXY, strict: true });
  container.register({
    passwordRecoveryRepository: asFunction(() => new PasswordRecoveryRepository()).scoped(),
    passwordRecoveryService: asFunction(({ passwordRecoveryRepository, rateLimitService, emailSender, logger }: Cradle) =>
      new PasswordRecoveryService(passwordRecoveryRepository, rateLimitService, emailSender, { warn: (event) => logger.warn({ event }, "Email delivery event") })).scoped(),
    sessionRepository: asFunction(() => new SessionRepository()).scoped(),
    sessionJwt: asFunction(() => new SessionJwt()).scoped(),
    sessionService: asFunction(({ sessionRepository, rateLimitService, sessionJwt }: Cradle) => new SessionService(sessionRepository, rateLimitService, sessionJwt)).scoped(),
    logger: asValue(logger),
    verificationRepository: asFunction(() => new VerificationRepository()).scoped(),
    verificationService: asFunction(({ verificationRepository, rateLimitService, emailSender, logger }: Cradle) => new VerificationService(verificationRepository, rateLimitService, emailSender, { warn: (event) => logger.warn({ event }, "Email delivery event") })).scoped(),
    requestId: asFunction(() => randomUUID()).scoped(),
    registrationRepository: asFunction(() => new RegistrationRepository()).scoped(),
    rateLimitRepository: asFunction(() => new RateLimitRepository()).scoped(),
    emailSender: asFunction(() => new SmtpEmailSender()).scoped(),
    rateLimitService: asFunction(({ rateLimitRepository }: Cradle) => new RateLimitService(rateLimitRepository, () => process.env.RATE_LIMIT_SECRET)).scoped(),
    registrationService: asFunction(({ registrationRepository, rateLimitService, emailSender, logger }: Cradle) =>
      new RegistrationService(registrationRepository, rateLimitService, emailSender, { warn: (event) => logger.warn({ event }, "Email delivery event") })).scoped(),
  });
  return container;
}
const container = createAppContainer();
export async function withScope<T>(run: (cradle: Cradle) => T | Promise<T>): Promise<T> {
  const scope = container.createScope();
  try { return await run(scope.cradle); }
  finally { await scope.dispose(); }
}
