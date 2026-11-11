import { z } from "zod";
import { mentorSlugSchema } from "../mentors/mentor-profile-update.schema";
export const bookingIdSchema=z.uuid().transform(value=>value.toLowerCase());
const command={requestId:bookingIdSchema};
const version={...command,expectedVersion:z.number().int().positive().max(2147483646)};
export const bookingCreateSchema=z.strictObject({...command,mentorSlug:mentorSlugSchema,slotId:bookingIdSchema,durationMinutes:z.union([z.literal(25),z.literal(50)]),expectedPriceCents:z.number().int().positive().max(2147483647),currency:z.literal("PLN")});
export const bookingRescheduleSchema=z.strictObject({...version,slotId:bookingIdSchema});
export const bookingCancelSchema=z.strictObject({...version,reason:z.string().trim().min(1).max(1000)});
export const bookingCompleteSchema=z.strictObject({...version,confirmation:z.literal(true)});
const tuple=z.string().max(100).transform((value,ctx)=>{
 const [date,id,...extra]=value.split("|");
 const valid=bookingIdSchema.safeParse(id),instant=z.iso.datetime({precision:3}).safeParse(date);
 if(extra.length||!valid.success||!instant.success){ctx.addIssue({code:"custom",message:"Invalid cursor"});return z.NEVER;}
 return {startsAt:new Date(instant.data),id:valid.data};
});
export const bookingListSchema=z.strictObject({view:z.enum(["upcoming","history"]).default("upcoming"),limit:z.coerce.number().int().min(1).max(100).default(25),after:z.string().max(120).optional()}).transform((value,ctx)=>{
 if(!value.after)return {...value,after:undefined};
 const prefix=value.view+"|";const parsed=tuple.safeParse(value.after.slice(prefix.length));
 if(!value.after.startsWith(prefix)||!parsed.success){ctx.addIssue({code:"custom",message:"Invalid cursor"});return z.NEVER;}
 return {...value,after:parsed.data};
});
export const bookingOptionsSchema=z.strictObject({slot:bookingIdSchema.optional(),duration:z.coerce.number().pipe(z.union([z.literal(25),z.literal(50)])).default(25),limit:z.coerce.number().int().min(1).max(100).default(50),after:tuple.optional()});
export const bookingEventsSchema=z.strictObject({after:z.coerce.number().int().min(0).max(2147483647).default(0),limit:z.coerce.number().int().min(1).max(100).default(25)});
export interface BookingDto {
 id:string;counterpart:{displayName:string;mentorSlug?:string};viewerRole:"developer"|"mentor"|"administrator";
 startsAt:string;endsAt:string;durationMinutes:number;priceCents:number;currency:string;status:string;version:number;
 createdAt:string;cancelledAt:string|null;completedAt:string|null;retentionExpiresAt:string;serverNow:string;
 allowedActions:{cancel:boolean;reschedule:boolean;complete:boolean};handoff:{guidance:string;supportUrl:string}|null;
}
export interface BookingDetail {booking:BookingDto;events:{kind:string;version:number;actorRole:"developer"|"mentor";actorName:string;occurredAt:string;reason:string|null;oldStartsAt:string|null;newStartsAt:string|null}[];nextCursor:string|null}
export interface BookingMutationResult extends BookingDetail {appliedVersion:number;replayed:boolean}
export interface BookingOptions {
 mentorName:string;bookingAvailable:boolean;unavailableReason:string|null;prices:{price25Cents:number;price50Cents:number}|null;handoff:{guidance:string;supportUrl:string}|null;
 slots:{id:string;startsAt:string;bookable:boolean;reason:string|null}[];nextCursor:string|null;serverNow:string;refreshAt:string|null;
}
