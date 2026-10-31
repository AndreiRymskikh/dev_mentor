"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { AdminUserDto, AdminUsersPage } from "@devmentor/core/validators/users";
import { apiCall } from "@devmentor/ui/backend/api";
import { DataTable } from "@devmentor/ui/backend/tables";
import { Button } from "@devmentor/ui/components/ui/button";
import { Input } from "@devmentor/ui/components/ui/input";
import { Link } from "@devmentor/ui/components/ui/link";
import { FormField } from "@devmentor/ui/backend/fields";
export function UsersList({ actorId, initial }: { actorId: string; initial: AdminUsersPage }) {
  const router = useRouter();
  const [data, setData] = useState<AdminUsersPage | null>(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [message, setMessage] = useState<string>();
  const [pending, setPending] = useState(false);
  const query = useRef({ page: initial.page, q: "" });
  const request = useRef<{ sequence: number; controller?: AbortController }>({ sequence: 0 });
  const mutation = useRef(false);
  useEffect(() => () => { request.current.sequence++; request.current.controller?.abort(); }, []);
  function clearAccess(expired = false) {
    request.current.sequence++; request.current.controller?.abort(); setData(null); if (expired) router.replace("/login?reason=session-expired"); else router.refresh();
  }
  function denied(code: string) {
    if (code !== "UNAUTHORIZED" && code !== "FORBIDDEN") return false;
    clearAccess(code === "UNAUTHORIZED"); return true;
  }
  async function load(page: number, q = query.current.q) {
    request.current.controller?.abort();
    const controller = new AbortController(); const sequence = ++request.current.sequence;
    request.current.controller = controller; query.current = { page, q }; setLoading(true); setError(undefined);
    try {
      const result = await apiCall<AdminUsersPage>(`/api/admin/users?page=${page}&pageSize=20&q=${encodeURIComponent(q)}`, { signal: controller.signal, cache: "no-store" });
      if (sequence !== request.current.sequence) return;
      if (!result.ok) { if (!denied(result.error.code)) setError(result.error.message); return; }
      setData(result.data);
    } catch { if (!controller.signal.aborted) setError("Unable to load users. Please try again."); }
    finally { if (sequence === request.current.sequence) setLoading(false); }
  }
  async function save(event: FormEvent<HTMLFormElement>, user: AdminUserDto) {
    event.preventDefault(); if (mutation.current) return;
    mutation.current = true; setPending(true); setMessage(undefined);
    const form = new FormData(event.currentTarget);
    try {
      const result = await apiCall(`/api/admin/users/${user.id}/roles`, { method: "PUT", body: JSON.stringify({ mentor: form.has("mentor"), administrator: form.has("administrator") }) });
      if (!result.ok) { if (!denied(result.error.code)) setMessage(result.error.code === "CONFLICT" ? "The last verified administrator cannot be removed." : result.error.message); return; }
      if (user.id === actorId && !form.has("administrator")) { clearAccess(); return; }
      setMessage("Roles updated."); await load(query.current.page);
    } finally { mutation.current = false; setPending(false); }
  }
  if (!data) return <section><h1>Access changed</h1><p>Your administrator session is no longer available.</p><Link href="/account">Your account</Link></section>;
  return <div><h1>Users</h1>
    <form onSubmit={event => { event.preventDefault(); const q = String(new FormData(event.currentTarget).get("q")).trim().toLowerCase(); void load(1, q); }}>
      <FormField label="Search email or name">{control => <Input {...control} name="q" maxLength={100} />}</FormField><Button type="submit" disabled={pending}>Search</Button>
    </form>{message && <p role="status">{message}</p>}
    <div className="users-table dm-workspace-panel" role="region" aria-label="Users table" tabIndex={0}><DataTable rows={data.items} columns={[
      { key: "name", label: "Name", render: user => user.displayName },
      { key: "email", label: "Email", render: user => user.email },
      { key: "payout", label: "Payout setup", render: user => user.roles.includes("mentor") ? "Not available" : "Not a mentor" },
      { key: "verified", label: "Verified", render: user => user.emailVerifiedAt ? "Yes" : "No" },
      { key: "roles", label: "Roles", render: user => user.roles.map(role => role === "developer" ? "Mentee" : role === "administrator" ? "Operator" : "Mentor").join(", ") },
    ]} rowKey={user => user.id} loading={loading} error={error} onRetry={() => { void load(query.current.page); }} page={data.page} pageSize={data.pageSize} total={data.total} onPageChange={page => { void load(page); }} actions={user => <form key={user.roles.join()} aria-label={`Roles for ${user.email}`} onSubmit={event => { void save(event, user); }}><fieldset disabled={pending || loading}><legend>Mentee (always enabled)</legend><label><input type="checkbox" name="mentor" defaultChecked={user.roles.includes("mentor")} />Mentor</label><label><input type="checkbox" name="administrator" defaultChecked={user.roles.includes("administrator")} />Operator</label><Button type="submit">Save roles</Button></fieldset></form>} /></div>
    {!loading && !error && data.items.length === 0 && data.page > 1 && <Button onClick={() => { void load(data.page - 1); }}>Previous page</Button>}
  </div>;
}
