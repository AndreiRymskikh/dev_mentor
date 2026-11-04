"use client";
import { useCallback, useEffect, useRef } from "react";
import { useApiResource, type apiCall } from "@devmentor/ui/backend/api";
import type { PublicAvailability } from "@devmentor/core/validators/availability";
/** Refresh authoritative data at its next time boundary and after returning to the page. */
export function useAvailability<T extends Pick<PublicAvailability, "serverNow" | "refreshAt">>(url: string, request: typeof apiCall<T>) {
  const requestedAt = useRef(0);
  const timedRequest = useCallback<typeof request>((...args) => {
    requestedAt.current = Date.now();
    return request(...args);
  }, [request]);
  const resource = useApiResource<T>(url, timedRequest), {data, reload} = resource;
  useEffect(() => {
    if (!data?.refreshAt) return;
    // Subtract the entire round trip: never extend eligibility by response latency.
    const timer = setTimeout(reload, Math.min(2147483647, Math.max(1, Date.parse(data.refreshAt) - Date.parse(data.serverNow) - (Date.now() - requestedAt.current))));
    return () => clearTimeout(timer);
  }, [data, reload]);
  useEffect(() => {
    const refresh = () => { if (document.visibilityState === "visible") reload(); };
    document.addEventListener("visibilitychange", refresh);
    return () => document.removeEventListener("visibilitychange", refresh);
  }, [reload]);
  return resource;
}
