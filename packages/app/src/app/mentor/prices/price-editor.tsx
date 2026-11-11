"use client";
import { useCallback, useState } from "react";
import { mentorPricesSchema, formatMoney, type OwnerPrices } from "@devmentor/core/validators/prices";
import { protectedRequest } from "../../../auth/protected-request";
import { useAvailability } from "../../../availability/use-availability";
import { CrudForm } from "@devmentor/ui/backend/forms";
import { ErrorMessage } from "@devmentor/ui/backend/feedback";
import { Button } from "@devmentor/ui/components/ui/button";
export function PriceEditor({ request: transport = protectedRequest, onSaved, showReadiness = true }: { request?: typeof protectedRequest; onSaved?: () => void; showReadiness?: boolean }) {
  const [denied, setDenied] = useState(false), [notice, setNotice] = useState("");
  const [loaded, setLoaded] = useState<OwnerPrices | null>(null);
  const request = useCallback<typeof protectedRequest<OwnerPrices>>(async (...args) => {
    const result = await transport<OwnerPrices>(...args);
    if (args[1]?.signal?.aborted) return result;
    if (result.ok) setLoaded(result.data);
    if (!result.ok && (result.error.code === "FORBIDDEN" || result.error.code === "UNAUTHORIZED")) setDenied(true);
    return result;
  }, [transport]);
  const resource = useAvailability<OwnerPrices>("/api/mentors/me/prices", request);
  // Keep drafts mounted through refreshes and failures. Only Cancel explicitly resets them.
  const [revision, setRevision] = useState(0);
  if (denied) return <ErrorMessage message="Mentor access is required. Reload after signing in."/>;
  const data = loaded;
  return <>
    {resource.loading && <p role="status">Checking current prices and offer readiness…</p>}
    {resource.error && <><ErrorMessage message={resource.error}/><Button onClick={resource.reload}>Retry loading prices</Button></>}
    {data && <>
      <p>Both prices save together in PLN. Bounds are inclusive; use at most two decimal places.</p>
      <CrudForm key={revision} schema={mentorPricesSchema} initialValues={{price25: data.savedPrices.price25Cents === null ? "" : formatMoney(data.savedPrices.price25Cents), price50: data.savedPrices.price50Cents === null ? "" : formatMoney(data.savedPrices.price50Cents)}}
        fields={[{name: "price25", label: "25-minute price (PLN)", required: true, hint: `PLN ${formatMoney(data.priceBounds.p25.minCents)}–${formatMoney(data.priceBounds.p25.maxCents)}`}, {name: "price50", label: "50-minute price (PLN)", required: true, hint: `PLN ${formatMoney(data.priceBounds.p50.minCents)}–${formatMoney(data.priceBounds.p50.maxCents)}`}]}
        onCancel={() => { setRevision(value => value + 1); setNotice(""); }}
        onSubmit={async values => { setNotice(""); const result = await request("/api/mentors/me/prices", {method: "PUT", body: JSON.stringify(values)}); return result; }}
        onSuccess={() => { setNotice("Both prices saved."); resource.reload(); onSaved?.(); }} submitLabel="Save both prices"/>
      {notice && <p role="status">{notice}</p>}
      {showReadiness && !resource.loading && !resource.error && resource.data && <p role="status">Offer preparation: {resource.data.mentorOfferReady ? "ready" : "incomplete"}. Published profile: {resource.data.readiness.profile ? "complete" : "incomplete"}; prices: {resource.data.readiness.prices ? "complete" : "incomplete"}; eligible availability: {resource.data.readiness.availability ? "complete" : "incomplete"}. New bookings also require free capacity and configured external service/support instructions.</p>}
    </>}
  </>;
}
