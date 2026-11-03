import { apiHandler } from "@devmentor/core/http";
import { withScope } from "@devmentor/core/container";
export const dynamic = "force-dynamic";
export function GET(request: Request, {params}: {params: Promise<{slug: string}>}) {
  return apiHandler(async () => withScope(async ({slotService}) => slotService.getPublicBySlug((await params).slug, Object.fromEntries(new URL(request.url).searchParams))), {noStore: true})(request);
}
