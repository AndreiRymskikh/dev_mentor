import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import { BookingMissingError, BookingKeyConflictError, type BookingRepository, type BookingSnapshot, type BookingDecisionContext, type BookingRecord, type BookingOperation } from "@devmentor/db";
import { AppError, ConflictError, ForbiddenError, NotFoundError, ServiceUnavailableError, UnauthorizedError } from "../../http/errors";
import { bookingCreateSchema, bookingRescheduleSchema, bookingCancelSchema, bookingCompleteSchema, bookingIdSchema, bookingListSchema, bookingEventsSchema, bookingOptionsSchema, type BookingDto, type BookingDetail, type BookingOptions } from "../../validators/bookings";
import { mentorSlugSchema } from "../../validators/mentors/mentor-profile-update.schema";
import { publicationLimit } from "../availability/slot.service";
import { readPricePolicy } from "../prices/policy";
import type { PricePolicy } from "../../validators/prices";
import { readBookingHandoff } from "./config";
const LEAD=7200000;
export function bookingRetention(endsAt:Date,terminal?:Date):Date {return publicationLimit(terminal&&terminal>endsAt?terminal:endsAt);}
export class BookingService {
 constructor(private readonly repository:Pick<BookingRepository,"mutate"|"read"|"list"|"options"|"maintain">,private readonly clock:()=>Date=()=>new Date(),private readonly policy:()=>PricePolicy=readPricePolicy,private readonly handoff:()=>{guidance:string;supportUrl:string}=readBookingHandoff) {}
 private actor(id:string|null){const parsed=bookingIdSchema.safeParse(id);if(!parsed.success)throw new UnauthorizedError();return parsed.data;}
 private parse<T>(schema:z.ZodType<T>,input:unknown):T {const parsed=schema.safeParse(input);if(!parsed.success)throw new AppError("VALIDATION_ERROR","Check booking fields.",422,Object.fromEntries(parsed.error.issues.map(issue=>[String(issue.path[0]??"_form"),[issue.message]])));return parsed.data;}
 private id(input:unknown){const parsed=bookingIdSchema.safeParse(input);if(!parsed.success)throw new NotFoundError();return parsed.data;}
 private async available<T>(work:()=>Promise<T>){try{return await work();}catch(error){if(error instanceof AppError)throw error;if(error instanceof BookingMissingError)throw new NotFoundError();if(error instanceof BookingKeyConflictError)throw new ConflictError("This request key was already used for another intent.");throw new ServiceUnavailableError();}}
 private optionalHandoff(){try{return this.handoff();}catch{return null;}}
 private dto(record:BookingSnapshot,actor:string):BookingDto {
  const b=record.booking,developer=b.developerUserId===actor,mentor=b.mentorUserId===actor,active=b.status==="booked";
  return {id:b.id,counterpart:{displayName:developer?record.mentorName:record.developerName,...(developer&&record.mentorSlug?{mentorSlug:record.mentorSlug}:{})},viewerRole:developer?"developer":mentor?"mentor":"administrator",
   startsAt:b.startsAt.toISOString(),endsAt:b.endsAt.toISOString(),durationMinutes:b.durationMinutes,priceCents:b.priceCents,currency:b.currency,status:b.status,version:b.version,createdAt:b.createdAt.toISOString(),cancelledAt:b.cancelledAt?.toISOString()??null,completedAt:b.completedAt?.toISOString()??null,retentionExpiresAt:b.retentionExpiresAt.toISOString(),serverNow:record.now.toISOString(),
   allowedActions:{cancel:active&&(developer||mentor),reschedule:active&&developer&&record.now<b.startsAt,complete:active&&developer&&record.now>=b.endsAt},handoff:this.optionalHandoff()};
 }
 private detail(record:BookingSnapshot,actor:string):BookingDetail {
  return {booking:this.dto(record,actor),events:record.events.map(event=>({kind:event.kind,version:event.version,actorRole:event.actorUserId===record.booking.developerUserId?"developer":"mentor",actorName:event.actorUserId===record.booking.developerUserId?record.developerName:record.mentorName,occurredAt:event.occurredAt.toISOString(),reason:event.reason??null,oldStartsAt:event.oldStartsAt?.toISOString()??null,newStartsAt:event.newStartsAt?.toISOString()??null})),nextCursor:record.nextEvent===null?null:String(record.nextEvent)};
 }
 private prices(profile:{price25Cents?:number|null;price50Cents?:number|null},policy:PricePolicy) {
  for(const [price,bound] of [[profile.price25Cents,policy.priceBounds.p25],[profile.price50Cents,policy.priceBounds.p50]] as const)if(price==null||!Number.isInteger(price)||price<bound.minCents||price>bound.maxCents)return null;
  return {price25Cents:profile.price25Cents!,price50Cents:profile.price50Cents!};
 }
 private async target(c:BookingDecisionContext,duration:number) {
  const handoff=this.handoff();void handoff;
  const policy=this.policy();
  if(!c.actor?.emailVerifiedAt||!c.developer)throw new ForbiddenError();
  if(!c.mentor||!c.profile?.publishedAt)throw new ConflictError("Mentor offer is no longer available.");
  if(c.profile.userId===c.actor.id)throw new ForbiddenError("You cannot book yourself.");
  const prices=this.prices(c.profile,policy);if(!prices)throw new ConflictError("Mentor prices are unavailable.");
  if(!c.slot||c.slot.removedAt||c.slot.startsAt.getTime()<c.now.getTime()+LEAD||c.slot.startsAt>publicationLimit(c.now))throw new ConflictError("Slot no longer available. Choose a new start.");
  const endsAt=new Date(c.slot.startsAt.getTime()+duration*60000);
  if(await c.conflicts(c.slot.startsAt,endsAt))throw new ConflictError("Slot no longer available. Choose a new start.");
  return {startsAt:c.slot.startsAt,endsAt,price:duration===25?prices.price25Cents:prices.price50Cents};
 }
 async create(actorId:string|null,input:unknown) {
  const actor=this.actor(actorId),data=this.parse(bookingCreateSchema,input);
  return this.command(actor,"create",data,undefined,async c=>{
   const target=await this.target(c,data.durationMinutes);
   if(data.expectedPriceCents!==target.price)throw new ConflictError("The price changed. Review the current offer before booking.");
   const booking:BookingRecord={id:randomUUID(),developerUserId:actor,mentorUserId:c.profile!.userId,slotId:c.slot!.id,startsAt:target.startsAt,endsAt:target.endsAt,durationMinutes:data.durationMinutes,priceCents:target.price,currency:"PLN",status:"booked",version:1,createdAt:c.now,updatedAt:c.now,cancelledAt:null,completedAt:null,retentionExpiresAt:bookingRetention(target.endsAt)};
   return {booking};
  });
 }
 async change(actorId:string|null,id:unknown,operation:Exclude<BookingOperation,"create">,input:unknown) {
  const actor=this.actor(actorId),bookingId=this.id(id);
  const data=operation==="reschedule"?this.parse(bookingRescheduleSchema,input):operation==="cancel"?this.parse(bookingCancelSchema,input):this.parse(bookingCompleteSchema,input);
  return this.command(actor,operation,data,bookingId,async c=>{
   const b=c.booking!;
   if(!c.actor?.emailVerifiedAt)throw new UnauthorizedError();
   if(b.status!=="booked"||b.version!==data.expectedVersion)throw new ConflictError("Booking changed. Refresh before trying again.");
   if(operation!=="cancel"&&b.developerUserId!==actor)throw new ForbiddenError();
   b.version++;b.updatedAt=c.now;
   if(operation==="reschedule") {
    if(c.now>=b.startsAt)throw new ConflictError("Rescheduling closes at the current start.");
    const target=await this.target(c,b.durationMinutes);b.slotId=c.slot!.id;b.startsAt=target.startsAt;b.endsAt=target.endsAt;b.retentionExpiresAt=bookingRetention(b.endsAt);
   }else if(operation==="cancel") {b.status="cancelled";b.cancelledAt=c.now;b.retentionExpiresAt=bookingRetention(b.endsAt,c.now);}
   else {if(c.now<b.endsAt)throw new ConflictError("Confirm service only after the scheduled end.");b.status="completed";b.completedAt=c.now;b.retentionExpiresAt=bookingRetention(b.endsAt,c.now);}
   return {booking:b,...("reason" in data?{reason:data.reason}:{})};
  });
 }
 private async command(actor:string,operation:BookingOperation,data:{requestId:string;slotId?:string;mentorSlug?:string},bookingId:string|undefined,decide:(c:BookingDecisionContext)=>Promise<{booking:BookingRecord;reason?:string}>) {
  const digest=createHash("sha256").update(JSON.stringify({operation,bookingId:bookingId??null,data})).digest("hex");
  const result=await this.available(()=>this.repository.mutate({actor,operation,bookingId,requestId:data.requestId,digest,slotId:data.slotId,mentorSlug:data.mentorSlug},this.clock,decide));
  return {...this.detail(result.snapshot,actor),appliedVersion:result.appliedVersion,replayed:result.replayed};
 }
 async read(actorId:string|null,id:unknown,query:unknown={},admin=false) {
  const actor=this.actor(actorId),bookingId=this.id(id),page=this.parse(bookingEventsSchema,query);
  const record=await this.available(()=>this.repository.read(actor,bookingId,this.clock,admin,page.after,page.limit));if(!record)throw new NotFoundError();return this.detail(record,actor);
 }
 async list(actorId:string|null,input:unknown={}) {
  const actor=this.actor(actorId),page=this.parse(bookingListSchema,input),result=await this.available(()=>this.repository.list(actor,page,this.clock));
  const last=result.items.at(-1);return {items:result.items.map(record=>this.dto(record,actor)),nextCursor:result.more&&last?`${page.view}|${last.booking.startsAt.toISOString()}|${last.booking.id}`:null,serverNow:result.now.toISOString()};
 }
 async options(slug:unknown,input:unknown={}):Promise<BookingOptions> {
  const parsed=mentorSlugSchema.safeParse(slug);if(!parsed.success)throw new NotFoundError();const page=this.parse(bookingOptionsSchema,input);
  const record=await this.available(()=>this.repository.options(parsed.data,page.limit,page.after,this.clock,page.duration,LEAD,page.slot));if(!record)throw new NotFoundError();
  let prices=null,unavailableReason:string|null=null;const handoff=this.optionalHandoff();
  try {prices=this.prices(record.profile,this.policy());}catch {unavailableReason="Price policy is unavailable.";}
  if(!prices&&!unavailableReason)unavailableReason="Mentor prices are unavailable.";
  if(!handoff)unavailableReason="Booking service and support instructions are unavailable.";
  const capable=Boolean(prices&&handoff),slots=record.slots.map(slot=>({id:slot.id,startsAt:slot.startsAt.toISOString(),bookable:capable&&!slot.occupied&&slot.startsAt<=publicationLimit(record.now),reason:slot.occupied?"Already reserved.":unavailableReason}));
  const last=slots.at(-1);return {mentorName:record.mentorName,bookingAvailable:capable,unavailableReason,prices,handoff,slots,nextCursor:record.more&&last?`${last.startsAt}|${last.id}`:null,serverNow:record.now.toISOString(),refreshAt:slots.length?new Date(Math.min(...slots.map(s=>new Date(s.startsAt).getTime()-LEAD+1))).toISOString():null};
 }
 async maintain(){return this.available(()=>this.repository.maintain(this.clock()));}
}
