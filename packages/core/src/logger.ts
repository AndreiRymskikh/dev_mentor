import pino from "pino";

export const logger = pino({
  redact: {
    paths: ["password", "token", "jwt", "secret", "authorization", "cookie", "*.password", "*.token", "*.jwt", "*.secret", "req.headers.authorization", "req.headers.cookie", "req.body", "res.headers.set-cookie"],
    censor: "[REDACTED]",
  },
});
