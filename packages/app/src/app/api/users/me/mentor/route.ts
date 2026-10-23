import { apiHandler, readJsonBody, requireCsrf, UnauthorizedError } from "@devmentor/core/http";
import { withScope } from "@devmentor/core/container";
import { readSessionCookie } from "../../../../../auth/session-cookie";
export const dynamic = "force-dynamic";
export const POST = apiHandler(async request => withScope(async ({ sessionService, rolesService }) => {
  const principal = await sessionService.resolve(readSessionCookie(request));
  if (!principal) throw new UnauthorizedError();
  requireCsrf(request, process.env.APP_ORIGIN);
  return rolesService.enrollMentor(principal.id, await readJsonBody(request, 4096, true));
}), { noStore: true });
