import { apiHandler } from "@devmentor/core/http";
import { withScope } from "@devmentor/core/container";
import { readSessionCookie } from "../../../../../auth/session-cookie";
export const dynamic = "force-dynamic";
export const GET = apiHandler(request => withScope(async ({ invitationService, sessionService }) => {
  const principal = await sessionService.resolve(readSessionCookie(request));
  return invitationService.onboarding(principal?.id ?? null);
}), { noStore: true });
