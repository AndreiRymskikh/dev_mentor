"use client";
import { useEffect, useState } from "react";

const key = "devmentor.invitation-return";
const ttl = 30 * 60 * 1000;
const allowed = /^\/invitation\/[A-Za-z0-9_-]{43}$/;

/** Only the invitation route is allowed. First-party storage expires across tabs. */
export function readInvitationReturn(): string | null {
  const query = new URLSearchParams(window.location.search);
  if (query.has("returnTo")) {
    const values = query.getAll("returnTo");
    const path = values.length === 1 && allowed.test(values[0]) ? values[0] : null;
    try {
      window.localStorage.removeItem(key);
      if (path) window.localStorage.setItem(key, JSON.stringify({ path, expires: Date.now() + ttl }));
    } catch { return path; } // Explicit valid continuation still works when storage is unavailable.
    return path;
  }
  try {
    const stored: unknown = JSON.parse(window.localStorage.getItem(key) ?? "null");
    if (stored && typeof stored === "object" && "path" in stored && typeof stored.path === "string" && allowed.test(stored.path) && "expires" in stored && typeof stored.expires === "number" && stored.expires > Date.now() && stored.expires <= Date.now() + ttl) return stored.path;
    window.localStorage.removeItem(key);
  } catch {
    try { window.localStorage.removeItem(key); } catch { return null; }
    return null;
  } // Storage denial must not break authentication.
  return null;
}
export function useInvitationReturn() {
  const [path, setPath] = useState<string | null>(null);
  useEffect(() => { const next = readInvitationReturn(); queueMicrotask(() => setPath(next)); }, []);
  return {
    href: (destination: string) => path ? `${destination}?returnTo=${encodeURIComponent(path)}` : destination,
    complete: () => {
      const next = readInvitationReturn();
      try { window.localStorage.removeItem(key); } catch { return next; }
      return next;
    },
  };
}
