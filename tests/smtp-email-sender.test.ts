import { EventEmitter } from "node:events";
import { afterEach, expect, test, vi } from "vitest";
import { SmtpEmailSender } from "../packages/core/src/services/emails/adapters/smtp-email-sender";
const state = vi.hoisted(() => ({ mode: "success", callbacks: [] as (() => void)[], connections: [] as { options: Record<string, unknown>; close: ReturnType<typeof vi.fn>; send: ReturnType<typeof vi.fn>; login: ReturnType<typeof vi.fn>; emit: (event: string) => boolean }[] }));
vi.mock("nodemailer/lib/smtp-connection", () => ({ default: class extends EventEmitter {
  close = vi.fn(() => { this.emit("end"); });
  send = vi.fn((_envelope: unknown, _body: string, callback: (error?: Error) => void) => { if (state.mode !== "send-stall") callback(state.mode === "send-error" ? new Error("sensitive") : undefined); });
  login = vi.fn((_auth: unknown, callback: (error?: Error) => void) => { if (state.mode === "auth-stall") state.callbacks.push(() => callback()); else callback(state.mode === "auth-error" ? new Error("sensitive") : undefined); });
  constructor(public options: Record<string, unknown>) { super(); state.connections.push(this); }
  connect(callback: () => void) {
    if (state.mode === "error") this.emit("error", new Error("private"));
    else if (state.mode === "end") this.emit("end");
    else if (state.mode === "connect-stall") state.callbacks.push(callback); else callback();
  }
} }));
const local = { NODE_ENV: "test", APP_ORIGIN: "http://localhost:3000", EMAIL_FROM: "sender@example.test", SMTP_HOST: "127.0.0.1", SMTP_PORT: "2525", SMTP_LOCAL_SINK: "true" };
const production = { NODE_ENV: "production", APP_ORIGIN: "https://app.example.test", EMAIL_FROM: "sender@example.test", SMTP_HOST: "smtp.example.test", SMTP_PORT: "587", SMTP_USER: "user", SMTP_PASSWORD: "secret" };
const message = { type: "verification" as const, to: "recipient@example.test", token: "a".repeat(43) };
afterEach(() => { vi.useRealTimers(); state.mode = "success"; state.connections.length = 0; state.callbacks.length = 0; });
test("lazy fixed configuration fails closed and permits plaintext only in explicit dev/test loopback policy", () => {
  const sender = new SmtpEmailSender(() => ({}));
  expect(() => sender.assertConfigured()).toThrow("Service temporarily unavailable");
  const invalid = [
    { ...local, SMTP_PORT: "0" }, { ...local, SMTP_PORT: "65536" }, { ...local, EMAIL_FROM: "invalid" },
    ...["http://user:pass@localhost", "http://localhost/path", "http://localhost?x=y", "http://localhost/#token", "ftp://localhost"].map(APP_ORIGIN => ({ ...local, APP_ORIGIN })),
    { ...local, NODE_ENV: "production" }, { ...local, NODE_ENV: undefined }, { ...local, SMTP_HOST: "outside.example.test" },
    { ...production, APP_ORIGIN: "http://app.example.test" }, { ...production, SMTP_USER: undefined }, { ...production, SMTP_PASSWORD: "" },
  ];
  for (const config of invalid) expect(() => new SmtpEmailSender(() => config).assertConfigured()).toThrow("Service temporarily unavailable");
  for (const config of [local, production, { ...local, NODE_ENV: "development", SMTP_HOST: "::1" }]) new SmtpEmailSender(() => config).assertConfigured();
  const env = { ...local };
  vi.stubEnv("APP_ORIGIN", env.APP_ORIGIN); vi.stubEnv("EMAIL_FROM", env.EMAIL_FROM); vi.stubEnv("SMTP_HOST", env.SMTP_HOST); vi.stubEnv("SMTP_PORT", env.SMTP_PORT); vi.stubEnv("SMTP_LOCAL_SINK", "true");
  new SmtpEmailSender().assertConfigured();
  vi.unstubAllEnvs();
});
test("sends explicit fragment links from configured origin/sender and requires production TLS/auth", async () => {
  await new SmtpEmailSender(() => local).send(message);
  expect(state.connections[0].send.mock.calls[0]).toEqual([{ from: local.EMAIL_FROM, to: [message.to] }, expect.stringContaining(`http://localhost:3000/verify-email#token=${message.token}`), expect.any(Function)]);
  expect(state.connections[0].close).toHaveBeenCalledOnce();
  for (const port of ["465", "587"]) {
    await new SmtpEmailSender(() => ({ ...production, SMTP_PORT: port })).send({ ...message, type: "password-reset" });
    const connection = state.connections.at(-1)!;
    expect(connection.options).toMatchObject({ requireTLS: true, ignoreTLS: false, secure: port === "465", tls: { rejectUnauthorized: true }, logger: false, debug: false });
    expect(connection.login).toHaveBeenCalledWith({ user: "user", pass: "secret" }, expect.any(Function));
    expect(connection.send.mock.calls[0][1]).toContain("https://app.example.test/reset-password#token=");
  }
  await expect(new SmtpEmailSender(() => local).send({ ...message, to: "bad\r\nBcc: bad@example.test" })).rejects.toMatchObject({ status: 503 });
  await expect(new SmtpEmailSender(() => local).send({ ...message, token: "invalid" })).rejects.toMatchObject({ status: 503 });
});
test("safe SMTP failures close the connection and deadlines cover connection, authentication and sending", async () => {
  vi.useFakeTimers();
  for (const mode of ["error", "end", "auth-error", "send-error", "connect-stall", "auth-stall", "send-stall"]) {
    state.mode = mode;
    const sending = new SmtpEmailSender(() => production).send(message);
    const failure = expect(sending).rejects.toMatchObject({ status: 503, message: "Service temporarily unavailable" });
    await vi.advanceTimersByTimeAsync(10_000);
    await failure;
    expect(state.connections.at(-1)!.close).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  }
});

test("callbacks after a timed-out connection cannot authenticate or send", async () => {
  vi.useFakeTimers();
  for (const mode of ["connect-stall", "auth-stall"]) {
    state.mode = mode;
    const sending = new SmtpEmailSender(() => production).send(message);
    const failure = expect(sending).rejects.toMatchObject({ status: 503 });
    await vi.advanceTimersByTimeAsync(10_000);
    await failure;
    state.callbacks.pop()!();
    expect(state.connections.at(-1)!.send).not.toHaveBeenCalled();
    if (mode === "connect-stall") expect(state.connections.at(-1)!.login).not.toHaveBeenCalled();
  }
});
