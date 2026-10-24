import { apiHandler, readJsonBody, requireCsrf } from "@devmentor/core/http";
import { withScope } from "@devmentor/core/container";
import { sessionCookie } from "../../../../auth/session-cookie";
export const dynamic = "force-dynamic";
export async function POST(request: Request): Promise<Response> {
  let cookie: string | undefined;
  return apiHandler(async (req) => {
    requireCsrf(req, process.env.APP_ORIGIN);
    const input = await readJsonBody(req);
    const result = await withScope(({ sessionService }) => sessionService.login(input, "shared-untrusted-peer"));
    cookie = sessionCookie(result.token);
    return result.principal;
  }, { noStore: true, response: () => ({ cookies: [cookie!] }) })(request);
}
