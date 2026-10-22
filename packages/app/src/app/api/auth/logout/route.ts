import { apiHandler, requireCsrf, readJsonBody, ValidationError } from "@devmentor/core/http";
import { logoutSchema } from "@devmentor/core/validators/users";
import { withScope } from "@devmentor/core/container";
import { readSessionCookie, sessionCookie } from "../../../../auth/session-cookie";
export const dynamic = "force-dynamic";
export const POST = apiHandler(async (request) => {
  requireCsrf(request, process.env.APP_ORIGIN);
  if (!logoutSchema.safeParse(await readJsonBody(request, 4096, true)).success) throw new ValidationError();
  return withScope(({ sessionService }) => sessionService.logout(readSessionCookie(request)));
}, { noStore: true, response: () => ({ cookies: [sessionCookie(null)] }) });
