"use client";
import type { PublicAvailability } from "@devmentor/core/validators/availability";
import { useAvailability } from "../../../availability/use-availability";
import { apiCall } from "@devmentor/ui/backend/api";
import { ResourcePanel } from "@devmentor/ui/backend/panels";
import { EmptyState } from "@devmentor/ui/backend/feedback";
import { LocalTime } from "@devmentor/ui/time";
export function PublicSlots({slug}: {slug: string}) {
  const resource = useAvailability<PublicAvailability>(`/api/mentors/${slug}/slots`, apiCall<PublicAvailability>);
  return <section aria-label="Published availability"><h3>Published availability</h3><ResourcePanel resource={resource}>{data => data.slots.length ? <ul className="dm-public-slots">{data.slots.map(slot => <li key={slot.id}><LocalTime value={slot.startsAt}/><span aria-disabled={!slot.eligible}>{slot.eligible ? "At least two hours ahead" : "Unavailable: less than two hours ahead"}</span></li>)}</ul> : <EmptyState message="No future starts are published."/>}</ResourcePanel><p>Eligibility is rechecked at the time boundary. Booking is not available yet.</p></section>;
}
