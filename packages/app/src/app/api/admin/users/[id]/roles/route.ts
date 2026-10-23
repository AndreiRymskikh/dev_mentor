import { apiHandler, readJsonBody, requireCsrf, requireRole, UnauthorizedError } from "@devmentor/core/http";
import { withScope } from "@devmentor/core/container";
import { readSessionCookie } from "../../../../../../auth/session-cookie";
export const dynamic = "force-dynamic";
export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  return apiHandler(async request => withScope(async ({ sessionService, rolesService }) => {
    const principal = await sessionService.resolve(readSessionCookie(request));
    if (!principal) throw new UnauthorizedError();
    requireRole({ userId: principal.id, roles: principal.roles }, "administrator");
    requireCsrf(request, process.env.APP_ORIGIN);
    const { id } = await context.params;
    return rolesService.setRoles(principal.id, id, await readJsonBody(request));
  }), { noStore: true })(request);
}
