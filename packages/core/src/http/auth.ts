import { ForbiddenError, UnauthorizedError, ServiceUnavailableError } from "./errors";

export type Role = "developer" | "mentor" | "administrator";
export interface Session { userId: string; roles: readonly Role[] }
export type SessionResolver = (request: Request) => Promise<Session | null>;

// A resolver must verify the session credential, not trust client-supplied IDs.
export async function requireSession(request: Request, resolve: SessionResolver): Promise<Session> {
  let session: Session | null;
  try { session = await resolve(request); }
  catch { throw new UnauthorizedError(); }
  if (!session || typeof session.userId !== "string" || !session.userId || !Array.isArray(session.roles) || !session.roles.every((role) => ["developer", "mentor", "administrator"].includes(role))) throw new UnauthorizedError();
  return session;
}
export function requireRole(session: Session, role: Role): void {
  if (!session.roles.includes(role)) throw new ForbiddenError();
}
export function assertOwnership(session: Session, ownerId: string | null | undefined): void {
  if (!ownerId || ownerId !== session.userId) throw new ForbiddenError();
}
export function assertOwnsBooking(session: Session, booking: { studentId: string }): void {
  assertOwnership(session, booking.studentId);
}
export function requireCsrf(request: Request, trustedOrigin?: string): void {
  if (request.headers.get("X-DevMentor-CSRF") !== "1") throw new ForbiddenError("Invalid request origin");
  let expected = new URL(request.url).origin;
  if (trustedOrigin !== undefined) {
    let configured: URL;
    try { configured = new URL(trustedOrigin); }
    catch { throw new ServiceUnavailableError(); }
    if (!["http:", "https:"].includes(configured.protocol) || configured.username || configured.password || configured.pathname !== "/" || configured.search || configured.hash) throw new ServiceUnavailableError();
    expected = configured.origin;
  }
  const origin = request.headers.get("origin");
  if (origin && origin !== expected) throw new ForbiddenError("Invalid request origin");
}
