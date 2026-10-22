import { randomUUID } from "node:crypto";
import { compare } from "bcryptjs";
import type { SessionRepository, Principal } from "@devmentor/db";
import { UnauthorizedError, ServiceUnavailableError, ValidationError } from "../../http/errors";
import { loginSchema } from "../../validators/users/login.schema";
import type { RateLimitService } from "../limits/rate-limit.service";
import { SessionJwt, SESSION_SECONDS } from "../sessions/jwt";
// Fixed cost-12 bcrypt hash; unknown and credentialless users still perform a comparison.
const dummyHash = "$2b$12$abcdefghijklmnopqrstuuH9fQ3Hh2rK3fb7Z5myZEH5Z7q9ZW9yG";
export class SessionService {
  constructor(private readonly repository: Pick<SessionRepository, "credentials" | "create" | "resolve" | "revoke">, private readonly limits: Pick<RateLimitService, "login">, private readonly jwt: SessionJwt) {}
  async login(input: unknown, ip: string): Promise<{ principal: Principal; token: string }> {
    const parsed = loginSchema.safeParse(input);
    if (!parsed.success) throw new ValidationError();
    await this.limits.login(parsed.data.email, ip);
    try {
      const credential = await this.repository.credentials(parsed.data.email);
      const valid = await compare(parsed.data.password, credential?.passwordHash ?? dummyHash);
      if (!valid || !credential || Buffer.byteLength(parsed.data.password, "utf8") > 72) throw new UnauthorizedError();
      const sessionId = randomUUID(); const issuedAt = Math.floor(Date.now() / 1000);
      const token = await this.jwt.sign(credential.userId, sessionId, issuedAt);
      const principal = await this.repository.create(credential.userId, credential.passwordHash, sessionId, new Date((issuedAt + SESSION_SECONDS) * 1000));
      if (!principal) throw new UnauthorizedError();
      return { principal, token };
    } catch (error) { if (error instanceof UnauthorizedError) throw error; throw new ServiceUnavailableError(); }
  }
  async resolve(token: string | null): Promise<Principal | null> {
    if (token === null) return null;
    const claims = await this.jwt.verify(token);
    if (!claims) return null;
    try { return await this.repository.resolve(claims.userId, claims.sessionId); }
    catch { throw new ServiceUnavailableError(); }
  }
  async logout(token: string | null): Promise<{ message: string }> {
    if (token !== null) {
      const claims = await this.jwt.verify(token);
      if (claims) {
        try { await this.repository.revoke(claims.userId, claims.sessionId); }
        catch { throw new ServiceUnavailableError(); }
      }
    }
    return { message: "Logged out." };
  }
}
