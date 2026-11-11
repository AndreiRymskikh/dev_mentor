"use client";
import { useEffect, useRef, useState } from "react";
import { useApiResource } from "@devmentor/ui/backend/api";
import { ResourcePanel } from "@devmentor/ui/backend/panels";
import { CrudForm } from "@devmentor/ui/backend/forms";
import { ErrorMessage } from "@devmentor/ui/backend/feedback";
import { Button } from "@devmentor/ui/components/ui/button";
import { Link } from "@devmentor/ui/components/ui/link";
import { bookingCancelSchema, bookingCompleteSchema, type BookingDetail } from "@devmentor/core/validators/bookings";
import { formatMoney } from "@devmentor/core/validators/prices";
import { protectedRequest } from "../../../../../auth/protected-request";
import { BookingTime } from "../../../../../bookings/booking-times";
import { BookingOptionsPanel } from "../../../../../bookings/booking-options";
import { useBookingCommand } from "../../../../../bookings/use-booking-command";
const cancelForm=bookingCancelSchema.pick({reason:true});
const completeForm=bookingCompleteSchema.pick({confirmation:true});
export function BookingDetailPanel({id}:{id:string}) {
 const resource=useApiResource<BookingDetail>(`/api/bookings/${encodeURIComponent(id)}`,protectedRequest<BookingDetail>),command=useBookingCommand();
 const [action,setAction]=useState<"cancel"|"reschedule"|"complete"|null>(null),[selected,setSelected]=useState<{id:string;start:string}|null>(null),[message,setMessage]=useState(""),[after,setAfter]=useState(""),dialog=useRef<HTMLDialogElement>(null);
 const history=useApiResource<BookingDetail>(`/api/bookings/${encodeURIComponent(id)}?after=${after||"0"}`,protectedRequest<BookingDetail>);
 useEffect(()=>{if(action==="complete")dialog.current?.showModal();},[action]);
 const reload=resource.reload;
 useEffect(()=>{const refresh=()=>{if(document.visibilityState==="visible")reload();};document.addEventListener("visibilitychange",refresh);return()=>document.removeEventListener("visibilitychange",refresh);},[reload]);
 async function mutate(operation:"cancel"|"reschedule"|"complete",values:Record<string,unknown>,version:number) {
  setMessage("");const result=await command.execute(`/api/bookings/${id}/${operation}`,{...values,expectedVersion:version});
  if(result.ok){setAction(null);dialog.current?.close();resource.reload();history.reload();setAfter("");}
  else setMessage(result.error.message);
  return result;
 }
 return <><h1>Private booking</h1><ResourcePanel resource={resource}>{({booking:b})=><>
  <h2>{b.counterpart.displayName}</h2><p><BookingTime instant={b.startsAt}/> – <BookingTime instant={b.endsAt}/></p><p>{b.durationMinutes} minutes · PLN {formatMoney(b.priceCents)} · {b.status}</p>
  {b.status==="completed"&&<p>Developer-confirmed service received. Payment is not verified.</p>}
  {b.status==="booked"&&new Date(b.serverNow)>=new Date(b.endsAt)&&<p>{b.viewerRole==="developer"?"Awaiting your confirmation":"Awaiting developer confirmation"}</p>}
  <p>Payment and the text session happen externally.</p>{b.handoff?<><p>{b.handoff.guidance}</p><Link href={b.handoff.supportUrl}>External support</Link></>:<p>Support instructions are temporarily unavailable. Existing cancellation and completion remain available.</p>}
  {message&&<ErrorMessage message={message}/>}
  <div className="dm-form-actions"><Button variant="text" onClick={()=>{resource.reload();history.reload();}}>Refresh booking</Button>{b.allowedActions.cancel&&<Button disabled={command.pending||command.uncertain} onClick={()=>setAction("cancel")}>Cancel booking</Button>}{b.allowedActions.reschedule&&<Button disabled={command.pending||command.uncertain} onClick={()=>setAction("reschedule")}>Reschedule</Button>}{b.allowedActions.complete&&<Button disabled={command.pending||command.uncertain} onClick={()=>setAction("complete")}>Confirm service received</Button>}</div>
  {action==="cancel"&&<section><h2>Cancel this booking</h2><p>The reason is private to both participants and current administrators. Do not include sensitive information.</p><CrudForm schema={cancelForm} fields={[{name:"reason",label:"Cancellation reason",type:"textarea",required:true}]} onSubmit={values=>mutate("cancel",values,b.version)} onCancel={()=>{if(!command.uncertain)setAction(null);}} submitLabel={command.uncertain?"Reconcile cancellation":"Confirm cancellation"}/></section>}
  {action==="reschedule"&&b.counterpart.mentorSlug&&<section><h2>Choose a new start</h2><p>The agreed price remains PLN {formatMoney(b.priceCents)}. Your original booking stays reserved until a move succeeds.</p><BookingOptionsPanel slug={b.counterpart.mentorSlug} duration={b.durationMinutes as 25|50} onSelect={(id,start)=>{if(!command.uncertain)setSelected({id,start});}}/>{selected&&<><p>Review new start: <BookingTime instant={selected.start}/></p><Button disabled={command.pending} onClick={()=>{void mutate("reschedule",{slotId:selected.id},b.version);}}>{command.uncertain?"Reconcile move":"Confirm new start"}</Button></>}<Button variant="text" disabled={command.uncertain} onClick={()=>setAction(null)}>Keep original booking</Button></section>}
  {action==="complete"&&<dialog ref={dialog} aria-labelledby="complete-title" onCancel={event=>{if(command.uncertain)event.preventDefault();else setAction(null);}}><h2 id="complete-title">Confirm service received</h2><p>This records your confirmation of service. It does not verify payment. Cancellation ends once you confirm.</p><CrudForm schema={completeForm} fields={[{name:"confirmation",label:"I confirm the mentor provided the service",type:"checkbox",required:true}]} onSubmit={values=>mutate("complete",values,b.version)} onCancel={()=>{if(!command.uncertain){setAction(null);dialog.current?.close();}}} submitLabel={command.uncertain?"Reconcile confirmation":"Confirm service received"}/></dialog>}
  <p>Private records are available until <BookingTime instant={b.retentionExpiresAt}/>.</p>
 </>}</ResourcePanel><section aria-label="Private booking history"><h2>Private history</h2><ResourcePanel resource={history}>{detail=><><ol>{detail.events.map(event=><li key={event.version}><strong>{event.kind}</strong> · {event.actorName} ({event.actorRole}) · <BookingTime instant={event.occurredAt}/>{event.reason&&<p>{event.reason}</p>}{event.oldStartsAt&&event.newStartsAt&&<p><BookingTime instant={event.oldStartsAt}/> → <BookingTime instant={event.newStartsAt}/></p>}</li>)}</ol>{detail.nextCursor&&<Button variant="text" onClick={()=>setAfter(detail.nextCursor!)}>Next history page</Button>}{after&&<Button variant="text" onClick={()=>setAfter("")}>First history page</Button>}</>}</ResourcePanel></section><Link href="/account">Your account</Link></>;
}
