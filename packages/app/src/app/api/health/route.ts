import { apiHandler } from "@devmentor/core/http";
import { withScope } from "@devmentor/core/container";

export const dynamic = "force-dynamic";

// Public liveness check; deliberately does not connect to the database.
export const GET = apiHandler(() => withScope(({ requestId }) => ({ status: "ok", requestId })));
