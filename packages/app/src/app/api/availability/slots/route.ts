import { ownedAction, readJsonBody } from "@devmentor/core/http";
import { withScope } from "@devmentor/core/container";
import { authorizeMentorSession } from "../../../../mentors/route";
export const dynamic = "force-dynamic";
export function GET(request: Request) {
  return withScope(({sessionService, slotService}) => ownedAction({
    authorize: request => authorizeMentorSession(sessionService, request), role: "mentor",
    action: session => slotService.getMine(session.userId),
  })(request));
}
export function POST(request: Request) {
  return withScope(({sessionService, slotService}) => ownedAction({
    authorize: request => authorizeMentorSession(sessionService, request), role: "mentor", mutate: true, trustedOrigin: process.env.APP_ORIGIN,
    action: async (session, request) => slotService.publish(session.userId, await readJsonBody(request, 1024)),
  })(request));
}
