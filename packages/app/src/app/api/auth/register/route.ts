import { apiHandler, readJsonBody, requireCsrf } from "@devmentor/core/http";
import { withScope } from "@devmentor/core/container";

export const dynamic = "force-dynamic";

export const POST = apiHandler(async (request) => {
  requireCsrf(request, process.env.APP_ORIGIN);
  const input = await readJsonBody(request);
  // Next's Request has no authenticated peer address. Never trust forwarded headers.
  return withScope(({ registrationService }) => registrationService.register(input, "shared-untrusted-peer"));
}, { noStore: true, response: () => ({ status: 202 }) });
