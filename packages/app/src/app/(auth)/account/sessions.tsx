"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { BookingDto } from "@devmentor/core/validators/bookings";
import { formatMoney } from "@devmentor/core/validators/prices";
import { useApiResource } from "@devmentor/ui/backend/api";
import { ResourcePanel } from "@devmentor/ui/backend/panels";
import { DataTable } from "@devmentor/ui/backend/tables";
import { EmptyState } from "@devmentor/ui/backend/feedback";
import { Button } from "@devmentor/ui/components/ui/button";
import { Link } from "@devmentor/ui/components/ui/link";
import { protectedRequest } from "../../../auth/protected-request";
import { BookingTime } from "../../../bookings/booking-times";
import "./sessions.css";

type BookingPage = { items: BookingDto[]; nextCursor: string | null; serverNow: string };

export function SessionsPanel() {
  const [view, setView] = useState<"upcoming" | "history">("upcoming");
  const [after, setAfter] = useState("");
  const resource = useApiResource<BookingPage>(`/api/bookings?view=${view}&limit=25${after ? `&after=${encodeURIComponent(after)}` : ""}`, protectedRequest<BookingPage>);
  const region = useRef<HTMLElement>(null), heading = useRef<HTMLHeadingElement>(null), focused = useRef<string | null>(null);
  const reload = resource.reload;
  const restart = useCallback(() => { setAfter(""); reload(); }, [reload]);

  useEffect(() => {
    function visible() { if (document.visibilityState === "visible") restart(); }
    function remember(event: FocusEvent) {
      const target = event.target as HTMLElement;
      focused.current = region.current?.contains(target) ? target.closest<HTMLAnchorElement>("a[data-booking]")?.getAttribute("href") ?? null : null;
    }
    document.addEventListener("visibilitychange", visible);
    document.addEventListener("focusin", remember);
    const timer = setInterval(restart, 60_000);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", visible); document.removeEventListener("focusin", remember); };
  }, [restart]);

  useEffect(() => {
    if (!resource.data) return;
    const now = Date.parse(resource.data.serverNow);
    const ends = resource.data.items.filter(b => b.status === "booked" && Date.parse(b.endsAt) > now).map(b => Date.parse(b.endsAt) - now + 1);
    if (!ends.length) return;
    const timer = setTimeout(restart, Math.min(60_000, ...ends));
    return () => clearTimeout(timer);
  }, [resource.data, restart]);

  useEffect(() => {
    if (resource.loading || !focused.current || document.activeElement !== document.body) return;
    const link = Array.from(region.current!.querySelectorAll<HTMLAnchorElement>("a[data-booking]")).find(a => a.getAttribute("href") === focused.current);
    (link ?? heading.current!).focus();
  }, [resource.loading, resource.data, resource.error]);

  return <section ref={region} className="dm-sessions dm-workspace-panel" aria-labelledby="sessions-heading">
    <h2 id="sessions-heading" ref={heading} tabIndex={-1}>Your bookings</h2>
    <p>Bookings where you are the developer or mentor. Payment and the text session happen externally; payment is not verified.</p>
    <div className="dm-form-actions" aria-label="Session views">
      <Button variant="text" aria-pressed={view === "upcoming"} onClick={() => { setView("upcoming"); setAfter(""); }}>Upcoming</Button>
      <Button variant="text" aria-pressed={view === "history"} onClick={() => { setView("history"); setAfter(""); }}>History</Button>
      <Button variant="text" onClick={restart}>Refresh sessions</Button>
    </div>
    <p>{view === "upcoming" ? "Upcoming includes sessions still in progress." : "History includes cancelled, developer-confirmed and ended sessions awaiting confirmation. Private records expire after six months under the booking retention policy."}</p>
    <ResourcePanel resource={resource}>{page => page.items.length ? <>
      <div role="region" aria-label="Session bookings" tabIndex={0} className="dm-sessions-scroll">
        <DataTable rows={page.items} rowKey={b => b.id} columns={[
          { key: "participant", label: "Participant", render: b => <><strong>{b.counterpart.displayName}</strong><p>You are the {b.viewerRole}</p></> },
          { key: "time", label: "Scheduled time", render: b => <><BookingTime instant={b.startsAt}/><p>Ends <BookingTime instant={b.endsAt}/></p></> },
          { key: "terms", label: "Agreed terms", render: b => <>{b.durationMinutes} minutes<p>{b.currency} {formatMoney(b.priceCents)}</p></> },
          { key: "status", label: "Status", render: b => b.status === "completed" ? "Developer-confirmed service received" : b.status === "cancelled" ? "Cancelled" : Date.parse(b.endsAt) <= Date.parse(page.serverNow) ? b.viewerRole === "developer" ? "Awaiting your confirmation" : "Awaiting developer confirmation" : "Booked" },
        ]} actions={b => <><Link data-booking href={`/account/bookings/${b.id}`}>View booking<span className="sr-only"> with {b.counterpart.displayName}</span></Link>
          <p>{b.allowedActions.reschedule && "Reschedule. "}{b.allowedActions.cancel && "Cancel with a private reason. "}{b.allowedActions.complete && "Confirm service received. "}</p></>}/>
      </div>
      <nav className="dm-form-actions" aria-label="Session pagination">
        {after && <Button variant="text" onClick={restart}>First page</Button>}
        {page.nextCursor && <Button variant="text" onClick={() => setAfter(page.nextCursor!)}>Next sessions</Button>}
      </nav>
    </> : <>
      <EmptyState message={after ? "No more sessions in this view." : view === "history" ? "No session history yet." : "No upcoming sessions yet."}/>
      {after ? <Button variant="text" onClick={restart}>First page</Button> : <p>{view === "upcoming" ? "Check History for ended or cancelled sessions, or find a mentor to book your first session." : "Completed, cancelled and ended sessions will appear here."}</p>}
      <Link href="/mentors">Find a mentor</Link>
    </>}</ResourcePanel>
  </section>;
}
