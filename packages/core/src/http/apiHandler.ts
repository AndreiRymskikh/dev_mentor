import { logger } from "../logger";
import { AppError, RateLimitError } from "./errors";

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: { code: string; message: string; fieldErrors?: Record<string, string[]> } };
export type RouteFunction<T> = (request: Request) => T | Promise<T>;

export interface ResponseMetadata {
  status?: 200 | 201 | 202;
  headers?: HeadersInit;
  cookies?: readonly string[];
}
export interface ApiHandlerOptions<T> {
  noStore?: boolean;
  response?: (data: T | null) => ResponseMetadata;
}

export function apiHandler<T>(handler: RouteFunction<T>, options: ApiHandlerOptions<T> = {}) {
  return async (request: Request): Promise<Response> => {
    try {
      const data = (await handler(request)) ?? null;
      const metadata = options.response?.(data);
      const headers = new Headers(metadata?.headers);
      if (options.noStore) headers.set("Cache-Control", "no-store");
      for (const cookie of metadata?.cookies ?? []) headers.append("Set-Cookie", cookie);
      return Response.json({ ok: true, data } satisfies ApiResult<T | null>, { status: metadata?.status, headers });
    } catch (error: unknown) {
      const headers = new Headers();
      if (options.noStore) headers.set("Cache-Control", "no-store");
      if (error instanceof RateLimitError) headers.set("Retry-After", String(error.retryAfterSeconds));
      if (error instanceof AppError) {
        return Response.json({ ok: false, error: { code: error.code, message: error.message, ...(error.fieldErrors ? { fieldErrors: error.fieldErrors } : {}) } }, { status: error.status, headers });
      }
      // Error messages can contain credentials or request bodies. Log a fixed event,
      // never the raw error, URL, headers, or payload.
      logger.error({ event: "api.unexpected_failure", method: request.method }, "Unexpected API failure");
      return Response.json({ ok: false, error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" } }, { status: 500, headers });
    }
  };
}
