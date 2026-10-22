import { createHmac } from "node:crypto";
import type { RateLimitRepository } from "@devmentor/db";
import { RateLimitError, ServiceUnavailableError } from "../../http/errors";

export class RateLimitService {
  constructor(private readonly repository: Pick<RateLimitRepository, "consume">, private readonly secret: () => string | undefined) {}

  async registration(ip: string): Promise<void> {
    await this.consume([["registration:ip", ip, 10]]);
  }

  async email(email: string, ip: string): Promise<void> {
    await this.consume([["email:address", email.trim().toLowerCase(), 3], ["email:ip", ip, 20]]);
  }

  async login(email: string, ip: string): Promise<void> {
    await this.consume([["login:pair", JSON.stringify([email.trim().toLowerCase(), ip]), 5], ["login:ip", ip, 50]], 900);
  }

  private async consume(buckets: readonly (readonly [string, string, number])[], windowSeconds?: 900 | 3600): Promise<void> {
    let result;
    try {
      const secret = this.secret();
      if (!secret || Buffer.byteLength(secret, "utf8") < 32) throw new Error("Missing rate limit secret");
      result = await this.repository.consume(buckets.map(([operation, value, limit]) => ({
        keyDigest: createHmac("sha256", secret).update(JSON.stringify([operation, value])).digest("hex"), limit, ...(windowSeconds === undefined ? {} : { windowSeconds }),
      })));
    } catch {
      throw new ServiceUnavailableError();
    }
    if (!result.allowed) throw new RateLimitError(result.retryAfterSeconds);
  }
}
