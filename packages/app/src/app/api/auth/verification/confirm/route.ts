import { apiHandler, readJsonBody, requireCsrf } from "@devmentor/core/http";
import { withScope } from "@devmentor/core/container";

export const dynamic = "force-dynamic";
export const POST = apiHandler(async (request) => {
  requireCsrf(request, process.env.APP_ORIGIN);
  const input = await readJsonBody(request);
  return withScope(({ verificationService }) => verificationService.confirm(input));
}, { noStore: true });
