import { apiHandler } from "@devmentor/core/http";
import { withScope } from "@devmentor/core/container";
export const dynamic = "force-dynamic";
export async function GET(request: Request, context: { params: Promise<{ token: string }> }) {
  return apiHandler(async () => withScope(async ({ invitationService }) => invitationService.lookup((await context.params).token)), { noStore: true })(request);
}
