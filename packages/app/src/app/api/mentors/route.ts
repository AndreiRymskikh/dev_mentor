import { apiHandler, AppError } from "@devmentor/core/http";
import { withScope } from "@devmentor/core/container";
export const dynamic = "force-dynamic";
export const GET = apiHandler((request: Request) => {
  const params = new URL(request.url).searchParams;
  if ([...params.keys()].some(key => params.getAll(key).length !== 1)) throw new AppError("VALIDATION_ERROR", "Invalid mentor catalog page.", 422);
  return withScope(({mentorCatalogService}) => mentorCatalogService.list(Object.fromEntries(params)));
}, {noStore: true});
