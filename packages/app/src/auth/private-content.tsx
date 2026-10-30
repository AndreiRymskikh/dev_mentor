"use client";
import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { sessionExpiredEvent } from "./protected-request";
export function PrivateContent({ children }: { children: ReactNode }) {
  const [expired, setExpired] = useState(false);
  const router = useRouter();
  useEffect(() => {
    function expire() { setExpired(true); router.replace("/login?reason=session-expired"); }
    window.addEventListener(sessionExpiredEvent, expire);
    return () => window.removeEventListener(sessionExpiredEvent, expire);
  }, [router]);
  return expired ? <p role="status">Your session has expired. Sign in again to continue.</p> : children;
}
