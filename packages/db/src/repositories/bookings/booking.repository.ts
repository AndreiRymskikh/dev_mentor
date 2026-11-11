import { LockMode, UniqueConstraintViolationException, type EntityManager, type InferEntity, type FilterQuery } from "@mikro-orm/postgresql";
import { randomUUID } from "node:crypto";
import { database } from "../../runtime";
import { Booking } from "../../entities/bookings/booking.entity";
import { BookingEvent } from "../../entities/bookings/booking-event.entity";
import { BookingCommand } from "../../entities/bookings/booking-command.entity";
import { User } from "../../entities/users/user.entity";
import { UserRole } from "../../entities/users/user-role.entity";
import { MentorProfile } from "../../entities/mentors/mentor-profile.entity";
import { Slot } from "../../entities/availability/slot.entity";
export type BookingRecord = InferEntity<typeof Booking>;
export type BookingEventRecord = InferEntity<typeof BookingEvent>;
export type BookingOperation = "create" | "reschedule" | "cancel" | "complete";
export interface BookingPageQuery {limit:number; view:"upcoming"|"history"; after?:{startsAt:Date;id:string}}
export interface BookingCommandInput {actor:string; requestId:string; digest:string; operation:BookingOperation; bookingId?:string; mentorSlug?:string; slotId?:string}
export interface BookingDecisionContext {
  booking:BookingRecord|null; profile:InferEntity<typeof MentorProfile>|null; slot:InferEntity<typeof Slot>|null;
  actor:InferEntity<typeof User>|null; developer:boolean; mentor:boolean; now:Date;
  conflicts:(start:Date,end:Date)=>Promise<boolean>;
}
export interface BookingChange {booking:BookingRecord; reason?:string}
export interface BookingSnapshot {booking:BookingRecord; mentorName:string; developerName:string; mentorSlug:string|null; events:BookingEventRecord[]; nextEvent:number|null; now:Date}
export interface BookingMutation {snapshot:BookingSnapshot; appliedVersion:number; replayed:boolean}
export class BookingMissingError extends Error {}
export class BookingKeyConflictError extends Error {}
export class BookingRepository {
  constructor(private readonly runtime=database) {}
  private async snapshot(em:EntityManager, booking:BookingRecord, now:Date, after=0, limit=25):Promise<BookingSnapshot> {
    const mentor=await em.findOneOrFail(User,{id:booking.mentorUserId});
    const developer=await em.findOneOrFail(User,{id:booking.developerUserId});
    const profile=await em.findOne(MentorProfile,{userId:booking.mentorUserId});
    const rows=limit===0?[]:await em.find(BookingEvent,{bookingId:booking.id,version:{$gt:after}},{orderBy:{version:"asc"},limit:limit+1});
    const events=rows.slice(0,limit).map(row=>({...row}));
    return {booking:{...booking},mentorName:mentor.displayName,developerName:developer.displayName,mentorSlug:profile?.slug??null,events,nextEvent:rows.length>limit?events[events.length-1].version:null,now};
  }
  private async replay(em:EntityManager,input:BookingCommandInput,now:Date):Promise<BookingMutation|null> {
    const command=await em.findOne(BookingCommand,{actorUserId:input.actor,requestId:input.requestId});
    if(!command)return null;
    const booking=await em.findOne(Booking,{id:command.bookingId,retentionExpiresAt:{$gt:now},$or:[{developerUserId:input.actor},{mentorUserId:input.actor}]},{lockMode:LockMode.PESSIMISTIC_READ});
    if(!booking)throw new BookingMissingError();
    if(command.digest!==input.digest||command.operation!==input.operation)throw new BookingKeyConflictError();
    return {snapshot:await this.snapshot(em,booking,now),appliedVersion:command.appliedVersion,replayed:true};
  }
  async mutate(input:BookingCommandInput,clock:()=>Date,decide:(context:BookingDecisionContext)=>Promise<BookingChange>):Promise<BookingMutation> {
    try {
      return await this.runtime.transaction(async em=>{
        const replay=await this.replay(em,input,clock()); if(replay)return replay;
        const candidate=input.bookingId?await em.findOne(Booking,{id:input.bookingId,$or:[{developerUserId:input.actor},{mentorUserId:input.actor}]}):null;
        const target=input.mentorSlug?await em.findOne(MentorProfile,{slug:input.mentorSlug}):null;
        if(input.bookingId&&!candidate||!input.bookingId&&!target)throw new BookingMissingError();
        const mentorId=candidate?candidate.mentorUserId:target!.userId;
        const developerId=candidate?candidate.developerUserId:input.actor;
        const ids=[...new Set([mentorId,developerId])].sort();
        for(const id of ids)await em.findOne(User,{id},{lockMode:LockMode.PESSIMISTIC_WRITE,refresh:true});
        // Both callers may miss the first lookup before waiting on these participant locks.
        const waitedReplay=await this.replay(em,input,clock()); if(waitedReplay)return waitedReplay;
        const now=clock();
        const booking=candidate?await em.findOne(Booking,{id:candidate.id,retentionExpiresAt:{$gt:now}},{lockMode:LockMode.PESSIMISTIC_WRITE,refresh:true}):null;
        if(candidate&&!booking)throw new BookingMissingError();
        const profile=await em.findOne(MentorProfile,{userId:mentorId},{refresh:true});
        const slot=input.slotId?await em.findOne(Slot,{id:input.slotId,mentorProfileId:mentorId},{lockMode:LockMode.PESSIMISTIC_WRITE,refresh:true}):null;
        const actor=await em.findOne(User,{id:input.actor},{refresh:true});
        const mentor=await em.findOne(User,{id:mentorId},{refresh:true});
        const developer=Boolean(await em.findOne(UserRole,{userId:input.actor,role:"developer"}));
        const activeMentor=Boolean(mentor?.emailVerifiedAt&&await em.findOne(UserRole,{userId:mentorId,role:"mentor"}));
        const old=booking?{slotId:booking.slotId,startsAt:booking.startsAt}:null;
        const change=await decide({booking:booking?{...booking}:null,profile,slot,actor,developer,mentor:activeMentor,now,
          conflicts:async(startsAt,endsAt)=>Boolean(await em.findOne(Booking,{status:{$ne:"cancelled"},retentionExpiresAt:{$gt:now},startsAt:{$lt:endsAt},endsAt:{$gt:startsAt},
            ...(booking?{id:{$ne:booking.id}}:{}),$or:[{mentorUserId:{$in:ids}},{developerUserId:{$in:ids}}]})),
        });
        const saved=booking?em.assign(booking,change.booking):em.create(Booking,change.booking);
        em.create(BookingEvent,{id:randomUUID(),bookingId:saved.id,actorUserId:input.actor,kind:input.operation==="create"?"created":input.operation==="reschedule"?"rescheduled":input.operation==="cancel"?"cancelled":"completed",
          version:saved.version,occurredAt:now,reason:change.reason??null,
          oldSlotId:input.operation==="reschedule"?old!.slotId:null,newSlotId:input.operation==="reschedule"?saved.slotId:null,
          oldStartsAt:input.operation==="reschedule"?old!.startsAt:null,newStartsAt:input.operation==="reschedule"?saved.startsAt:null});
        em.create(BookingCommand,{id:randomUUID(),actorUserId:input.actor,requestId:input.requestId,digest:input.digest,operation:input.operation,bookingId:saved.id,appliedVersion:saved.version,createdAt:now});
        await em.flush();
        return {snapshot:await this.snapshot(em,saved,now),appliedVersion:saved.version,replayed:false};
      });
    } catch(error) {
      if(!(error instanceof UniqueConstraintViolationException))throw error;
      // A different intent using the same actor/key can serialize on a different mentor.
      return this.runtime.transaction(async em=>{const replay=await this.replay(em,input,clock());if(!replay)throw error;return replay;});
    }
  }
  async read(actor:string,id:string,clock:()=>Date,admin=false,after=0,limit=25):Promise<BookingSnapshot|null> {
    return this.runtime.transaction(async em=>{
      const user=await em.findOne(User,{id:actor},{lockMode:LockMode.PESSIMISTIC_READ});
      if(!user?.emailVerifiedAt)return null;
      if(admin&&!await em.findOne(UserRole,{userId:actor,role:"administrator"}))return null;
      const now=clock(),booking=await em.findOne(Booking,{id,retentionExpiresAt:{$gt:now},...(admin?{}:{$or:[{mentorUserId:actor},{developerUserId:actor}]})});
      return booking?this.snapshot(em,booking,now,after,limit):null;
    });
  }
  async list(actor:string,query:BookingPageQuery,clock:()=>Date) {
    return this.runtime.transaction(async em=>{
      const now=clock(),history=query.view==="history";
      const where:FilterQuery<BookingRecord>={retentionExpiresAt:{$gt:now},$and:[{$or:[{mentorUserId:actor},{developerUserId:actor}]},history?{$or:[{status:{$ne:"booked"}},{endsAt:{$lte:now}}]}:{status:"booked",endsAt:{$gt:now}}]};
      if(query.after)where.$and!.push({$or:[{startsAt:{[history?"$lt":"$gt"]:query.after.startsAt}},{startsAt:query.after.startsAt,id:{[history?"$lt":"$gt"]:query.after.id}}]});
      const rows=await em.find(Booking,where,{orderBy:{startsAt:history?"desc":"asc",id:history?"desc":"asc"},limit:query.limit+1});
      const items:BookingSnapshot[]=[];
      for(const row of rows.slice(0,query.limit))items.push(await this.snapshot(em,row,now,0,0));
      return {items,more:rows.length>query.limit,now};
    });
  }
  async options(slug:string,limit:number,after:{startsAt:Date;id:string}|undefined,clock:()=>Date,duration:number,leadMs:number,selectedSlot?:string) {
    return this.runtime.transaction(async em=>{
      const candidate=await em.findOne(MentorProfile,{slug}); if(!candidate)return null;
      const mentor=await em.findOne(User,{id:candidate.userId},{lockMode:LockMode.PESSIMISTIC_READ});
      const role=await em.findOne(UserRole,{userId:candidate.userId,role:"mentor"});
      const profile=await em.findOne(MentorProfile,{userId:candidate.userId,publishedAt:{$ne:null}},{refresh:true});
      if(!mentor?.emailVerifiedAt||!role||!profile)return null;
      const now=clock();
      const where:FilterQuery<InferEntity<typeof Slot>>={mentorProfileId:profile.userId,...(selectedSlot?{id:selectedSlot}:{}),removedAt:null,startsAt:{$gte:new Date(now.getTime()+leadMs)}};
      if(after)where.$or=[{startsAt:{$gt:after.startsAt}},{startsAt:after.startsAt,id:{$gt:after.id}}];
      const rows=await em.find(Slot,where,{orderBy:{startsAt:"asc",id:"asc"},limit:limit+1});
      const slots=[];
      for(const slot of rows.slice(0,limit)) {
        const occupied=Boolean(await em.findOne(Booking,{status:{$ne:"cancelled"},retentionExpiresAt:{$gt:now},startsAt:{$lt:new Date(slot.startsAt.getTime()+duration*60000)},endsAt:{$gt:slot.startsAt},$or:[{mentorUserId:profile.userId},{developerUserId:profile.userId}]}));
        slots.push({id:slot.id,startsAt:slot.startsAt,occupied});
      }
      return {profile,mentorName:mentor.displayName,slots,more:rows.length>limit,now};
    });
  }
  async maintain(now:Date) {
    return this.runtime.transaction(async em=>{
      await em.execute("set local lock_timeout = '5s'");await em.execute("set local statement_timeout = '30s'");
      const rows=await em.find(Booking,{retentionExpiresAt:{$lte:now}},{orderBy:{retentionExpiresAt:"asc",id:"asc"},limit:500,lockMode:LockMode.PESSIMISTIC_PARTIAL_WRITE});
      if(!rows.length)return 0;
      await em.nativeDelete(Booking,{id:{$in:rows.map(row=>row.id)}});return rows.length;
    });
  }
}
