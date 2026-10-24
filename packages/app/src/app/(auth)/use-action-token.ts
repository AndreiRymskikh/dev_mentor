"use client";
import { useEffect, useRef, useState } from "react";
import { verificationConfirmSchema } from "@devmentor/core/validators/users";

/** A token lives only in component memory; navigation and reload deliberately discard it. */
export function useActionToken(path: "/verify-email" | "/reset-password") {
  const initialized = useRef(false);
  const [token, setToken] = useState<string | null>(null);
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    const fragment = window.location.hash.slice(1);
    try { window.history.replaceState(window.history.state, "", path); }
    catch { return; }
    const params = new URLSearchParams(fragment);
    const values = params.getAll("token");
    if (values.length !== 1 || [...params.keys()].some((key) => key !== "token")) return;
    const parsed = verificationConfirmSchema.safeParse({ token: values[0] });
    if (parsed.success) queueMicrotask(() => setToken(parsed.data.token));
  }, [path]);
  return token;
}
