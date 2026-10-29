"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiCall } from "@devmentor/ui/backend/api";
import { Button } from "@devmentor/ui/components/ui/button";
import { ErrorMessage } from "@devmentor/ui/backend/feedback";
export function AcceptButton({ token }: { token: string }) {
  const router = useRouter(); const [pending, setPending] = useState(false); const [error, setError] = useState<string | null>(null);
  async function accept() {
    setPending(true); setError(null);
    const result = await apiCall(`/api/invitations/${token}/accept`, { method: "POST", body: "{}" });
    setPending(false);
    if (!result.ok) { setError(result.error.message); return; }
    router.replace("/mentor"); router.refresh();
  }
  return <div className="grid gap-group"><Button loading={pending} disabled={pending} onClick={() => { void accept(); }}>Accept invitation</Button>{error && <ErrorMessage message={error} />}</div>;
}
