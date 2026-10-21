import SMTPConnection from "nodemailer/lib/smtp-connection";
import { z } from "zod";
import { ServiceUnavailableError } from "../../../http/errors";
import type { EmailMessage, EmailSender } from "../email-sender.port";

import { EMAIL_DELIVERY_TIMEOUT_MS as DELIVERY_TIMEOUT_MS } from "../delivery-policy";

const configuration = z.object({
  APP_ORIGIN: z.url(),
  EMAIL_FROM: z.email(),
  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_LOCAL_SINK: z.enum(["true", "false"]).optional(),
  NODE_ENV: z.string().optional(),
});

type Configuration = z.infer<typeof configuration>;

/** Public SMTPConnection API gives the deadline ownership of the live connection. */
export class SmtpEmailSender implements EmailSender {
  constructor(private readonly environment: () => Record<string, string | undefined> = () => process.env) {}

  private config(): Configuration {
    const parsed = configuration.safeParse(this.environment());
    if (!parsed.success) throw new ServiceUnavailableError();
    const config = parsed.data;
    const origin = new URL(config.APP_ORIGIN);
    const local = config.SMTP_LOCAL_SINK === "true";
    if (origin.username || origin.password || origin.pathname !== "/" || origin.search || origin.hash ||
        (local ? !["development", "test"].includes(config.NODE_ENV ?? "") || !["127.0.0.1", "::1"].includes(config.SMTP_HOST) || !["http:", "https:"].includes(origin.protocol)
          : origin.protocol !== "https:" || !config.SMTP_USER || !config.SMTP_PASSWORD)) {
      throw new ServiceUnavailableError();
    }
    return config;
  }

  assertConfigured(): void { this.config(); }

  async send(message: EmailMessage): Promise<void> {
    const config = this.config();
    if (!z.email().safeParse(message.to).success || !/^[A-Za-z0-9_-]{43}$/.test(message.token)) throw new ServiceUnavailableError();
    const local = config.SMTP_LOCAL_SINK === "true";
    const path = message.type === "verification" ? "/verify-email" : "/reset-password";
    const subject = message.type === "verification" ? "Verify your DevMentor email" : "Reset your DevMentor password";
    const link = new URL(path, config.APP_ORIGIN);
    link.hash = `token=${message.token}`;
    const connection = new SMTPConnection({
      host: config.SMTP_HOST, port: config.SMTP_PORT,
      secure: !local && config.SMTP_PORT === 465, requireTLS: !local, ignoreTLS: local,
      tls: { rejectUnauthorized: true },
      connectionTimeout: DELIVERY_TIMEOUT_MS, greetingTimeout: DELIVERY_TIMEOUT_MS, socketTimeout: DELIVERY_TIMEOUT_MS, dnsTimeout: DELIVERY_TIMEOUT_MS,
      logger: false, debug: false,
    });
    await new Promise<void>((resolve, reject) => {
      let settled = false;
      const finish = (failed: boolean) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        connection.close();
        if (failed) reject(new ServiceUnavailableError());
        else resolve();
      };
      const timer = setTimeout(() => finish(true), DELIVERY_TIMEOUT_MS);
      connection.on("error", () => finish(true));
      connection.on("end", () => finish(true));
      const deliver = () => connection.send({ from: config.EMAIL_FROM, to: [message.to] },
        `From: ${config.EMAIL_FROM}\r\nTo: ${message.to}\r\nSubject: ${subject}\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n${subject}:\r\n${link.href}\r\n`,
        (error) => finish(Boolean(error)));
      connection.connect(() => {
        if (settled) return;
        if (local) deliver();
        else connection.login({ user: config.SMTP_USER, pass: config.SMTP_PASSWORD }, (error) => {
          if (settled) return;
          if (error) finish(true);
          else deliver();
        });
      });
    });
  }
}
