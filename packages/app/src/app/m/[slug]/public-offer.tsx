"use client";
import { apiCall } from "@devmentor/ui/backend/api";
import { ResourcePanel } from "@devmentor/ui/backend/panels";
import { formatMoney, type PublicOffer } from "@devmentor/core/validators/prices";
import { useAvailability } from "../../../availability/use-availability";
export function PublicOfferPanel({slug}: {slug: string}) {
  const resource = useAvailability<PublicOffer>(`/api/mentors/${encodeURIComponent(slug)}/offer`, apiCall<PublicOffer>);
  return <ResourcePanel resource={resource}>{offer => <>
    {offer.prices ? <dl aria-label="Session prices"><dt>25 minutes</dt><dd>PLN {formatMoney(offer.prices.price25Cents)}</dd><dt>50 minutes</dt><dd>PLN {formatMoney(offer.prices.price50Cents)}</dd></dl> : <p>Prices are not set within current bounds.</p>}
    <p>{offer.mentorOfferReady ? "Offer preparation is complete." : "Not bookable yet."} Booking and payment are not available yet.</p>
  </>}</ResourcePanel>;
}
