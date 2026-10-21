export type EmailMessage =
  | { type: "verification"; to: string; token: string }
  | { type: "password-reset"; to: string; token: string };

/** Configuration validation is lazy, but must precede persistence. */
export interface EmailSender {
  assertConfigured(): void;
  send(message: EmailMessage): Promise<void>;
}
