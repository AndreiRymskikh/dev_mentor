import { logger } from "../logger";
import { AppError } from "./errors";

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: { code: string; message: string; fieldErrors?: Record<string, string[]> } };
export type RouteFunction<T> = (request: Request) => T | Promise<T>;

export function apiHandler<T>(handler: RouteFunction<T>) {
  return async (request: Request): Promise<Response> => {
    try {
      const data = (await handler(request)) ?? null;
      return Response.json({ ok: true, data } satisfies ApiResult<T | null>);
    } catch (error: unknown) {
      if (error instanceof AppError) {
        return Response.json({ ok: false, error: { code: error.code, message: error.message, ...(error.fieldErrors ? { fieldErrors: error.fieldErrors } : {}) } }, { status: error.status });
      }
      // Error messages can contain credentials or request bodies. Log a fixed event,
      // never the raw error, URL, headers, or payload.
      logger.error({ event: "api.unexpected_failure", method: request.method }, "Unexpected API failure");
      return Response.json({ ok: false, error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" } }, { status: 500 });
    }
  };
}
