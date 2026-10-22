import { SignJWT, jwtVerify } from "jose";
import { z } from "zod";
import { ServiceUnavailableError } from "../../http/errors";
export const SESSION_SECONDS = 86400;
const issuer = "devmentor";
const audience = "devmentor-session";
const uuid = z.uuid();
export class SessionJwt {
  constructor(private readonly secret: () => string | undefined = () => process.env.JWT_SECRET) {}
  private key(): Uint8Array {
    const value = this.secret();
    if (!value || Buffer.byteLength(value, "utf8") < 32) throw new ServiceUnavailableError();
    return new TextEncoder().encode(value);
  }
  async sign(userId: string, sessionId: string, issuedAt: number): Promise<string> {
    return new SignJWT({ sid: sessionId }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setSubject(userId).setIssuer(issuer).setAudience(audience).setIssuedAt(issuedAt).setExpirationTime(issuedAt + SESSION_SECONDS).sign(this.key());
  }
  async verify(token: string): Promise<{ userId: string; sessionId: string } | null> {
    if (token.length > 2048 || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token)) return null;
    const key = this.key();
    try {
      const { payload } = await jwtVerify(token, key, { algorithms: ["HS256"], issuer, audience, typ: "JWT", requiredClaims: ["sub", "sid", "iat", "exp"], maxTokenAge: SESSION_SECONDS });
      if (!uuid.safeParse(payload.sub).success || !uuid.safeParse(payload.sid).success || !Number.isInteger(payload.iat) || !Number.isInteger(payload.exp) || payload.exp! - payload.iat! !== SESSION_SECONDS || payload.iat! > Math.floor(Date.now() / 1000)) return null;
      return { userId: payload.sub!, sessionId: payload.sid as string };
    } catch { return null; }
  }
}
