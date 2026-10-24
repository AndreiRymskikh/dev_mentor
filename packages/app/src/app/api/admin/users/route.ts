import { apiHandler, requireRole, UnauthorizedError, ValidationError } from "@devmentor/core/http";
import { withScope } from "@devmentor/core/container";
import { readSessionCookie } from "../../../../auth/session-cookie";
export const dynamic = "force-dynamic";
export const GET = apiHandler(async request => withScope(async ({ sessionService, adminUsersService }) => {
  const principal = await sessionService.resolve(readSessionCookie(request));
  if (!principal) throw new UnauthorizedError();
  requireRole({ userId: principal.id, roles: principal.roles }, "administrator");
  const params = new URL(request.url).searchParams;
  const input: Record<string, string> = {};
  for (const [key, value] of params) {
    if (Object.hasOwn(input, key)) throw new ValidationError();
    Object.defineProperty(input, key, { value, enumerable: true });
  }
  return adminUsersService.list(principal.id, input);
}), { noStore: true });
