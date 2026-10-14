import { ForbiddenError, UnauthorizedError } from "./errors";

export interface Session { userId: string; role?: string }
export type SessionResolver = (request: Request) => Promise<Session | null>;

// A resolver must verify the session credential, not trust client-supplied IDs.
export async function requireSession(request: Request, resolve: SessionResolver): Promise<Session> {
  let session: Session | null;
  try { session = await resolve(request); }
  catch { throw new UnauthorizedError(); }
  if (!session || typeof session.userId !== "string" || !session.userId) throw new UnauthorizedError();
  return session;
}
export function requireRole(session: Session, role: string): void {
  if (session.role !== role) throw new ForbiddenError();
}
export function assertOwnership(session: Session, ownerId: string | null | undefined): void {
  if (!ownerId || ownerId !== session.userId) throw new ForbiddenError();
}
export function assertOwnsBooking(session: Session, booking: { studentId: string }): void {
  assertOwnership(session, booking.studentId);
}
export function requireCsrf(request: Request): void {
  if (request.headers.get("X-DevMentor-CSRF") !== "1") throw new ForbiddenError("Invalid request origin");
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) throw new ForbiddenError("Invalid request origin");
}
