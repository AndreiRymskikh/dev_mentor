"use client";
import { useCallback, useState } from "react";
import { slotUtcFormSchema, type OwnerAvailability } from "@devmentor/core/validators/availability";
import { useAvailability } from "../../../availability/use-availability";
import { protectedRequest } from "../../../auth/protected-request";
import { ResourcePanel } from "@devmentor/ui/backend/panels";
import { CrudForm } from "@devmentor/ui/backend/forms";
import { DataTable } from "@devmentor/ui/backend/tables";
import { ErrorMessage } from "@devmentor/ui/backend/feedback";
import { Button } from "@devmentor/ui/components/ui/button";
import { LocalTime } from "@devmentor/ui/time";
export function SlotEditor({ request: transport = protectedRequest, onChanged }: { request?: typeof protectedRequest; onChanged?: () => void }) {
  const [showPast, setShowPast] = useState(false), [cursor, setCursor] = useState<string | null>(null), [denied, setDenied] = useState(false);
  const request = useCallback<typeof protectedRequest<OwnerAvailability>>(async (...args) => {
    const result = await transport<OwnerAvailability>(...args);
    if (!result.ok && (result.error.code === "FORBIDDEN" || result.error.code === "UNAUTHORIZED")) setDenied(true);
    return result;
  }, [transport]);
  const resource = useAvailability<OwnerAvailability>(`/api/availability/slots?view=${showPast ? "all" : "future"}${cursor ? `&after=${encodeURIComponent(cursor)}` : ""}`, request);
  if (denied) return <ErrorMessage message="Mentor access is required. Reload after signing in."/>;
  return <SlotForm data={resource.data} reload={() => { resource.reload(); onChanged?.(); }} resource={resource} showPast={showPast}
    request={request} onShowPast={value => { setShowPast(value); setCursor(null); }} cursor={cursor} onPage={setCursor}/>;
}
export function SlotForm({data, reload, resource, showPast = false, onShowPast, cursor = null, onPage, request = protectedRequest<OwnerAvailability>}: {
  data: OwnerAvailability | null; reload: () => void; request?: typeof protectedRequest<OwnerAvailability>;
  resource?: {loading: boolean; error: string | null; data: OwnerAvailability | null; reload: () => void};
  showPast?: boolean; onShowPast?: (value: boolean) => void; cursor?: string | null; onPage?: (cursor: string | null) => void;
}) {
  const [pending, setPending] = useState(false), [error, setError] = useState(""), [revision, setRevision] = useState(0), [notice, setNotice] = useState("");
  function reset() { setNotice(""); setRevision(value => value + 1); reload(); }
  async function remove(id: string) {
    setError(""); setNotice(""); setPending(true);
    const result = await request(`/api/availability/slots/${id}`, {method: "DELETE"});
    setPending(false);
    if (result.ok) { setNotice("Start removed."); reload(); } else setError(result.error.message);
  }
  return <>
    <section className="dm-slot-publication" id="available-time"><h2>Add an available time</h2>
    <p>Publish future starts up to six UTC calendar months ahead. Public eligibility requires at least two hours’ lead, including exactly two hours.</p>
    <CrudForm key={revision} schema={slotUtcFormSchema} fields={[{name: "startsAt", label: "Start time (UTC)", hint: "Enter YYYY-MM-DDTHH:mm, for example 2026-12-15T14:30. This field always uses UTC.", required: true}]} submitLabel="Publish start" onSubmit={values => { setNotice(""); return request("/api/availability/slots", {method: "POST", body: JSON.stringify(values)}); }} onSuccess={() => { reset(); setNotice("Start published."); }} onCancel={reset}/>
    {notice && <p role="status">{notice}</p>}
    </section><section className="dm-slot-list"><h2>Your available times</h2><p>Booking and cancellation are not available yet. All start times are shown in UTC.</p>
    <h3>Published starts</h3><label><input type="checkbox" checked={showPast} onChange={event => onShowPast?.(event.target.checked)}/> Show past starts</label>
    {error && <ErrorMessage message={error}/>}
    <ResourcePanel resource={resource ?? {data, loading:false, error:null, reload}}>{data => <>
    <p>Latest permitted start: <LocalTime value={data.policy.latestPublishAt}/></p>
    <p role="status">Availability checklist: {data.availabilityComplete ? "complete" : "incomplete"}. Rechecked against server time; it expires when no eligible start remains. Booking is not available yet.</p>
    <div className="dm-slots-table" role="region" aria-label="Published starts" tabIndex={0} aria-busy={pending}><DataTable rows={data.slots} rowKey={slot => slot.id} columns={[{key: "startsAt", label: "Start (UTC)", render: slot => <time dateTime={slot.startsAt}>{slot.startsAt.replace("T", " ").replace(":00.000Z", " UTC")}</time>}, {key: "eligibility", label: "Public eligibility", render: slot => slot.eligible ? "Eligible" : "Less than two hours ahead or past"}]} actions={slot => <Button variant="text" disabled={pending} onClick={() => void remove(slot.id)}>Remove</Button>}/></div>
    <div aria-label="Availability pages"><Button variant="text" disabled={!cursor} onClick={() => onPage?.(null)}>First page</Button><Button variant="text" disabled={!data.nextCursor} onClick={() => onPage?.(data.nextCursor)}>Next page</Button></div>
    {data.lastPublishedAvailabilityAt && <p>Last publication: <LocalTime value={data.lastPublishedAvailabilityAt}/></p>}
    </>}</ResourcePanel></section>
  </>;
}
