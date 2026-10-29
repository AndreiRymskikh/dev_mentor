import { apiHandler, readJsonBody, requireCsrf, UnauthorizedError, ValidationError } from "@devmentor/core/http";
import { withScope } from "@devmentor/core/container";
import { readSessionCookie } from "../../../../../auth/session-cookie";
export const dynamic = "force-dynamic";
export async function POST(request: Request, context: { params: Promise<{ token: string }> }) {
  return apiHandler(async () => withScope(async ({ invitationService, sessionService }) => {
    const principal = await sessionService.resolve(readSessionCookie(request));
    if (!principal) throw new UnauthorizedError();
    requireCsrf(request, process.env.APP_ORIGIN);
    const input = await readJsonBody(request, 4096, true);
    if (!input || typeof input !== "object" || Array.isArray(input) || Object.keys(input).length) throw new ValidationError();
    return invitationService.accept(principal.id, (await context.params).token);
  }), { noStore: true })(request);
}
