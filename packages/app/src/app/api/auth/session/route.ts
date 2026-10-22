import { apiHandler, UnauthorizedError } from "@devmentor/core/http";
import { withScope } from "@devmentor/core/container";
import { readSessionCookie } from "../../../../auth/session-cookie";
export const dynamic = "force-dynamic";
export const GET = apiHandler(async (request) => {
  const principal = await withScope(({ sessionService }) => sessionService.resolve(readSessionCookie(request)));
  if (!principal) throw new UnauthorizedError();
  return principal;
}, { noStore: true });
