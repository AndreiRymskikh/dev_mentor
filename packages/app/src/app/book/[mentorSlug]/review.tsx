"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiCall } from "@devmentor/ui/backend/api";
import { ResourcePanel } from "@devmentor/ui/backend/panels";
import { ErrorMessage } from "@devmentor/ui/backend/feedback";
import { Button } from "@devmentor/ui/components/ui/button";
import { Link } from "@devmentor/ui/components/ui/link";
import type { BookingOptions } from "@devmentor/core/validators/bookings";
import { formatMoney } from "@devmentor/core/validators/prices";
import { useAvailability } from "../../../availability/use-availability";
import { BookingOptionsPanel } from "../../../bookings/booking-options";
import { BookingTime } from "../../../bookings/booking-times";
import { useBookingCommand } from "../../../bookings/use-booking-command";
export function BookingReview({slug,slot,duration}:{slug:string;slot:string;duration:25|50}) {
 const router=useRouter(),command=useBookingCommand({mentorSlug:slug,slotId:slot,durationMinutes:duration}),[message,setMessage]=useState(""),[login,setLogin]=useState(false);
 const resource=useAvailability<BookingOptions>(`/api/mentors/${encodeURIComponent(slug)}/booking-options?duration=${duration}&slot=${encodeURIComponent(slot)}`,apiCall<BookingOptions>);
 const continuation=`/book/${slug}?slot=${slot}&duration=${duration}`;
 async function submit(input:Record<string,unknown>) {
  setMessage("");const result=await command.execute("/api/bookings",input);
  if(result.ok){router.push(`/account/bookings/${result.data.booking.id}`);return;}
  setMessage(result.error.message);setLogin(result.error.code==="UNAUTHORIZED");if(!["OUTCOME_UNKNOWN","UNAUTHORIZED"].includes(result.error.code))resource.reload();
 }
 return <><h1>Review your booking</h1>{message&&<ErrorMessage message={message}/>}{login&&<Link href={`/login?returnTo=${encodeURIComponent(continuation)}`}>Sign in to continue this booking</Link>}
 {command.uncertain&&<section aria-label="Reconcile booking"><p role="status">Reconciliation uses your original reviewed terms, even if the current offer changed.</p><Button disabled={command.pending} onClick={()=>submit({})}>{command.pending?"Booking…":"Reconcile booking attempt"}</Button></section>}
 <ResourcePanel resource={resource}>{offer=>{
  const selected=offer.slots.find(item=>item.id===slot),price=offer.prices?(duration===25?offer.prices.price25Cents:offer.prices.price50Cents):null;
  return <><h2>{offer.mentorName}</h2>{selected&&<p><BookingTime instant={selected.startsAt}/></p>}<p>{duration} minutes{price!==null?` · PLN ${formatMoney(price)}`:""}</p>
   <p>Payment goes directly to the mentor. The text session and support happen outside DevMentor. Payment is not verified here.</p>
   {offer.handoff&&<><p>{offer.handoff.guidance}</p><Link href={offer.handoff.supportUrl}>External support</Link></>}
   {!selected?.bookable||!offer.bookingAvailable?<p>{offer.unavailableReason??"Selected start is no longer available. Choose a fresh option below."}</p>:null}
   {!command.uncertain&&<Button disabled={command.pending||!selected?.bookable||price===null} onClick={()=>submit({mentorSlug:slug,slotId:slot,durationMinutes:duration,expectedPriceCents:price,currency:"PLN"})}>{command.pending?"Booking…":"Book session"}</Button>}
  </>;
 }}</ResourcePanel>{!command.uncertain&&<BookingOptionsPanel slug={slug} duration={duration}/>}<Link href={`/m/${slug}`}>Back to mentor</Link></>;
}
