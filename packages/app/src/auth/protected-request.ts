"use client";
import { apiCall } from "@devmentor/ui/backend/api";
export const sessionExpiredEvent = "devmentor:session-expired";
/** The app owns session recovery; the standalone UI transport stays route-agnostic. */
export async function protectedRequest<T = unknown>(...args: Parameters<typeof apiCall<T>>) {
  const result = await apiCall<T>(...args);
  if (!result.ok && result.error.code === "UNAUTHORIZED") window.dispatchEvent(new Event(sessionExpiredEvent));
  return result;
}
