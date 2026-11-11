import { defineEntity, p } from "@mikro-orm/postgresql";
import { Booking } from "./booking.entity";
import { User } from "../users/user.entity";
import { Slot } from "../availability/slot.entity";
export const BookingEvent = defineEntity({
  name: "BookingEvent", tableName: "booking_events",
  uniques: [{name:"booking_events_version_unique", properties:["bookingId","version"]}],
  checks:[
    {name:"booking_events_kind_check", expression:"kind in ('created','rescheduled','cancelled','completed') and version > 0"},
    {name:"booking_events_reason_check", expression:"(kind = 'cancelled' and reason is not null and length(btrim(reason)) >= 1 and length(btrim(reason)) <= 1000) or (kind <> 'cancelled' and reason is null)"},
    {name:"booking_events_move_check", expression:"(kind = 'rescheduled' and old_slot_id is not null and new_slot_id is not null and old_starts_at is not null and new_starts_at is not null) or (kind <> 'rescheduled' and old_slot_id is null and new_slot_id is null and old_starts_at is null and new_starts_at is null)"},
  ],
  properties:{
    id:p.uuid().primary(), bookingId:p.manyToOne(Booking).fieldName("booking_id").mapToPk().deleteRule("cascade"),
    actorUserId:p.manyToOne(User).fieldName("actor_user_id").mapToPk().deleteRule("restrict"),
    kind:p.string().length(12), version:p.integer(), occurredAt:p.datetime(), reason:p.text().nullable(),
    oldSlotId:p.manyToOne(Slot).fieldName("old_slot_id").mapToPk().deleteRule("restrict").nullable(),
    newSlotId:p.manyToOne(Slot).fieldName("new_slot_id").mapToPk().deleteRule("restrict").nullable(),
    oldStartsAt:p.datetime().nullable(), newStartsAt:p.datetime().nullable(),
  },
});
