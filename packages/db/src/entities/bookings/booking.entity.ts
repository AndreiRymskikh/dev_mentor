import { defineEntity, p } from "@mikro-orm/postgresql";
import { User } from "../users/user.entity";
import { Slot } from "../availability/slot.entity";
export const Booking = defineEntity({
  name: "Booking", tableName: "bookings",
  indexes: [
    {name: "bookings_mentor_start_index", properties: ["mentorUserId", "startsAt"]},
    {name: "bookings_developer_start_index", properties: ["developerUserId", "startsAt"]},
    {name: "bookings_retention_index", properties: ["retentionExpiresAt", "id"]},
  ],
  checks: [
    {name:"bookings_terms_check", expression:"developer_user_id <> mentor_user_id and duration_minutes in (25,50) and price_cents > 0 and currency = 'PLN' and version > 0"},
    {name:"bookings_time_check", expression:"isfinite(starts_at) and isfinite(ends_at) and isfinite(retention_expires_at) and ends_at = (starts_at + ((duration_minutes)::double precision * '00:01:00'::interval))"},
    {name:"bookings_state_check", expression:"(status = 'booked' and cancelled_at is null and completed_at is null) or (status = 'cancelled' and cancelled_at is not null and completed_at is null) or (status = 'completed' and completed_at is not null and cancelled_at is null)"},
  ],
  properties: {
    id: p.uuid().primary(),
    developerUserId: p.manyToOne(User).fieldName("developer_user_id").mapToPk().deleteRule("restrict"),
    mentorUserId: p.manyToOne(User).fieldName("mentor_user_id").mapToPk().deleteRule("restrict"),
    slotId: p.manyToOne(Slot).fieldName("slot_id").mapToPk().deleteRule("restrict"),
    startsAt: p.datetime(), endsAt: p.datetime(), durationMinutes: p.integer(), priceCents: p.integer(), currency: p.string().length(3),
    status: p.string().length(10), version: p.integer(), createdAt: p.datetime(), updatedAt: p.datetime(),
    cancelledAt: p.datetime().nullable(), completedAt: p.datetime().nullable(), retentionExpiresAt: p.datetime(),
  },
});
