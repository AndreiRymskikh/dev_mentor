"use client";
import { useCallback, useEffect, useState } from "react";
import { apiCall } from "./apiCall";
export function useApiResource<T>(url: string) {
  const [version, setVersion] = useState(0);
  const [state, setState] = useState<{ url: string; version: number; data: T | null; error: string | null }>({ url: "", version: -1, data: null, error: null });
  useEffect(() => {
    const controller = new AbortController();
    void apiCall<T>(url, { signal: controller.signal }).then(result => {
      if (!controller.signal.aborted) setState({ url, version, data: result.ok ? result.data : null, error: result.ok ? null : result.error.message });
    }).catch(() => {
      // apiCall rethrows cancellation; cleanup owns it and must not update a newer resource.
      if (!controller.signal.aborted) setState({ url, version, data: null, error: "Unable to load this resource. Please try again." });
    });
    return () => controller.abort();
  }, [url, version]);
  const reload = useCallback(() => setVersion(value => value + 1), []), loading = state.url !== url || state.version !== version;
  return { data: loading ? null : state.data, error: loading ? null : state.error, loading, reload };
}
