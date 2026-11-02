import { ownedAction } from "@devmentor/core/http";
import { withScope } from "@devmentor/core/container";
import { authorizeMentorSession } from "../../../../mentors/route";
export const dynamic = "force-dynamic";
export function DELETE(request: Request, {params}: {params: Promise<{id: string}>}) {
  return withScope(({sessionService, slotService}) => ownedAction({
    authorize: request => authorizeMentorSession(sessionService, request), role: "mentor", mutate: true, trustedOrigin: process.env.APP_ORIGIN,
    action: async session => slotService.remove(session.userId, (await params).id),
  })(request));
}
