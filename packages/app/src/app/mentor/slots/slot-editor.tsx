"use client";
import { useState } from "react";
import { slotUtcFormSchema, type OwnerAvailability } from "@devmentor/core/validators/availability";
import { useAvailability } from "../../../availability/use-availability";
import { protectedRequest } from "../../../auth/protected-request";
import { ResourcePanel } from "@devmentor/ui/backend/panels";
import { CrudForm } from "@devmentor/ui/backend/forms";
import { DataTable } from "@devmentor/ui/backend/tables";
import { ErrorMessage } from "@devmentor/ui/backend/feedback";
import { Button } from "@devmentor/ui/components/ui/button";
import { LocalTime } from "@devmentor/ui/time";
export function SlotEditor() {
  const resource = useAvailability<OwnerAvailability>("/api/availability/slots", protectedRequest<OwnerAvailability>);
  return <ResourcePanel resource={resource}>{data => <SlotForm data={data} reload={resource.reload}/>}</ResourcePanel>;
}
export function SlotForm({data, reload}: {data: OwnerAvailability; reload: () => void}) {
  const [showPast, setShowPast] = useState(false), [pending, setPending] = useState(false), [error, setError] = useState("");
  async function remove(id: string) {
    setError(""); setPending(true);
    const result = await protectedRequest(`/api/availability/slots/${id}`, {method: "DELETE"});
    setPending(false);
    if (result.ok) reload(); else setError(result.error.message);
  }
  return <>
    <p>Publish future starts up to {data.policy.publicationMonths} UTC calendar months ahead. Public eligibility requires at least {data.policy.eligibilityLeadHours} hours’ lead, including exactly two hours.</p>
    <p>Latest permitted start: <LocalTime value={data.policy.latestPublishAt}/></p>
    <p role="status">Availability checklist: {data.availabilityComplete ? "complete" : "incomplete"}. Rechecked against server time; it expires when no eligible start remains. Booking is not available yet.</p>
    <CrudForm schema={slotUtcFormSchema} fields={[{name: "startsAt", label: "Start time (UTC)", hint: "Enter YYYY-MM-DDTHH:mm, for example 2026-12-15T14:30. This field always uses UTC.", required: true}]} submitLabel="Publish start" onSubmit={values => protectedRequest("/api/availability/slots", {method: "POST", body: JSON.stringify(values)})} onSuccess={reload} onCancel={reload}/>
    <h2>Published starts</h2><label><input type="checkbox" checked={showPast} onChange={event => setShowPast(event.target.checked)}/> Show past starts</label>
    {error && <ErrorMessage message={error}/>}
    <div className="dm-slots-table" role="region" aria-label="Published starts" tabIndex={0} aria-busy={pending}><DataTable rows={data.slots.filter(slot => showPast || slot.startsAt > data.serverNow)} rowKey={slot => slot.id} columns={[{key: "startsAt", label: "Start", render: slot => <LocalTime value={slot.startsAt}/>}, {key: "eligibility", label: "Public eligibility", render: slot => slot.eligible ? "Eligible" : "Less than two hours ahead or past"}]} actions={slot => <Button variant="text" disabled={pending} onClick={() => void remove(slot.id)}>Remove</Button>}/></div>
    {data.lastPublishedAvailabilityAt && <p>Last publication: <LocalTime value={data.lastPublishedAvailabilityAt}/></p>}
  </>;
}
