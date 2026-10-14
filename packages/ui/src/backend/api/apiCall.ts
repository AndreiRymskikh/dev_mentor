import type { ApiResult } from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
export function isApiResult(value: unknown): value is ApiResult<unknown> {
  if (!isRecord(value)) return false;
  if (value.ok === true) return "data" in value;
  if (value.ok !== false || !isRecord(value.error)) return false;
  const { code, message, fieldErrors } = value.error;
  return typeof code === "string" && typeof message === "string" &&
    (fieldErrors === undefined || (isRecord(fieldErrors) && Object.values(fieldErrors).every((messages) => Array.isArray(messages) && messages.every((message) => typeof message === "string"))));
}
export async function readJsonSafe(response: Response): Promise<unknown> {
  try { return JSON.parse(await response.text()) as unknown; }
  catch { return null; }
}
export class ApiCallError extends Error {
  constructor(public readonly error: Extract<ApiResult<never>, { ok: false }>["error"]) { super(error.message); }
}
export async function apiCall<T>(path: string, options: RequestInit = {}): Promise<ApiResult<T>> {
  const pathname = path.split("?")[0];
  if (!path.startsWith("/api/") || /[\\#]/.test(path) || pathname.split("/").some((part) => part === "." || part === ".." || part.includes("%"))) {
    throw new Error("apiCall requires a same-origin /api/ path");
  }
  const headers = new Headers(options.headers);
  headers.set("X-DevMentor-CSRF", "1");
  if (options.body && !headers.has("Content-Type") && typeof options.body === "string") headers.set("Content-Type", "application/json");
  try {
    const response = await fetch(path, { ...options, credentials: "same-origin", headers });
    const result = await readJsonSafe(response);
    if (!isApiResult(result) || (response.ok && result.ok === false) || (!response.ok && result.ok === true)) {
      return { ok: false, error: { code: "INVALID_RESPONSE", message: "Unexpected server response" } };
    }
    return result as ApiResult<T>;
  } catch (error: unknown) {
    if (options.signal?.aborted) throw error;
    return { ok: false, error: { code: "NETWORK_ERROR", message: "Unable to reach the server" } };
  }
}
export async function apiCallOrThrow<T>(path: string, options?: RequestInit): Promise<T> {
  const result = await apiCall<T>(path, options);
  if (!result.ok) throw new ApiCallError(result.error);
  return result.data;
}
