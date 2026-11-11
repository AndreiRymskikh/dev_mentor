"use client";
import { useState } from "react";
import { apiCall } from "@devmentor/ui/backend/api";
import { ResourcePanel } from "@devmentor/ui/backend/panels";
import { Button } from "@devmentor/ui/components/ui/button";
import { Link } from "@devmentor/ui/components/ui/link";
import { useAvailability } from "../availability/use-availability";
import type { BookingOptions } from "@devmentor/core/validators/bookings";
import { formatMoney } from "@devmentor/core/validators/prices";
import { BookingTime } from "./booking-times";
export function BookingOptionsPanel({slug,onSelect,duration:fixedDuration}:{slug:string;onSelect?:(id:string,start:string)=>void;duration?:25|50}) {
 const [duration,setDuration]=useState<25|50>(fixedDuration??25),[after,setAfter]=useState("");
 const resource=useAvailability<BookingOptions>(`/api/mentors/${slug}/booking-options?duration=${duration}${after?`&after=${encodeURIComponent(after)}`:""}`,apiCall<BookingOptions>);
 return <section className="dm-booking-options" aria-label="Book a session">
  {!fixedDuration&&<label>Session duration <select value={duration} onChange={event=>{setDuration(Number(event.target.value) as 25|50);setAfter("");}}><option value="25">25 minutes</option><option value="50">50 minutes</option></select></label>}
  <ResourcePanel resource={resource}>{offer=><>
   {offer.prices&&<p>Agreed price for {duration} minutes: PLN {formatMoney(duration===25?offer.prices.price25Cents:offer.prices.price50Cents)}</p>}
   {offer.unavailableReason&&<p role="status">{offer.unavailableReason}</p>}
   {!offer.slots.length&&<p>No eligible starts are available. Choose another mentor or check again later.</p>}
   <ul>{offer.slots.map(slot=><li key={slot.id}><BookingTime instant={slot.startsAt}/>{slot.bookable?(onSelect?<Button onClick={()=>onSelect(slot.id,slot.startsAt)}>Select start</Button>:<Link href={`/book/${slug}?slot=${slot.id}&duration=${duration}`}>Review booking</Link>):<p>{slot.reason}</p>}</li>)}</ul>
   <div className="dm-form-actions"><Button variant="text" onClick={()=>{setAfter("");resource.reload();}}>Refresh starts</Button>{offer.nextCursor&&<Button variant="text" onClick={()=>setAfter(offer.nextCursor!)}>Next starts</Button>}</div>
  </>}</ResourcePanel>
 </section>;
}
