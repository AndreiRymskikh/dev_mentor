"use client";
import { useState } from "react";
import { Button } from "@devmentor/ui/components/ui/button";
import type { PublicAvailability } from "@devmentor/core/validators/availability";
import { useAvailability } from "../../../availability/use-availability";
import { apiCall } from "@devmentor/ui/backend/api";
import { ResourcePanel } from "@devmentor/ui/backend/panels";
import { EmptyState } from "@devmentor/ui/backend/feedback";
import { LocalTime } from "@devmentor/ui/time";
export function PublicSlots({slug}: {slug: string}) {
  const [cursor, setCursor] = useState<string | null>(null);
  const resource = useAvailability<PublicAvailability>(`/api/mentors/${slug}/slots${cursor ? `?after=${encodeURIComponent(cursor)}` : ""}`, apiCall<PublicAvailability>);
  return <section aria-label="Published availability"><h3>Published availability</h3><ResourcePanel resource={resource}>{data => <>{data.slots.length ? <ul className="dm-public-slots">{data.slots.map(slot => <li key={slot.id}><LocalTime value={slot.startsAt}/><span aria-disabled={!slot.eligible}>{slot.eligible ? "At least two hours ahead" : "Unavailable: less than two hours ahead"}</span></li>)}</ul> : <EmptyState message={cursor ? "No more future starts on this page." : "No future starts are published."}/>}<div aria-label="Availability pages"><Button variant="text" disabled={!cursor} onClick={() => setCursor(null)}>First page</Button><Button variant="text" disabled={!data.nextCursor} onClick={() => setCursor(data.nextCursor)}>Next page</Button></div></>}</ResourcePanel><p>These published starts do not show reserved capacity. Use the duration-specific booking options above; eligibility is rechecked before confirmation.</p></section>;
}
