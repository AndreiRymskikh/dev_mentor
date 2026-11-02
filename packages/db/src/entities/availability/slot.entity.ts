import { defineEntity, p } from "@mikro-orm/postgresql";
import { MentorProfile } from "../mentors/mentor-profile.entity";
export const Slot = defineEntity({
  name: "Slot", tableName: "slots",
  indexes: [
    { name: "slots_active_start_unique", expression: "create unique index slots_active_start_unique on slots (mentor_profile_id, starts_at) where removed_at is null" },
    { name: "slots_mentor_start_index", properties: ["mentorProfileId", "startsAt"] },
  ],
  properties: {
    id: p.uuid().primary(),
    mentorProfileId: p.manyToOne(MentorProfile).fieldName("mentor_profile_id").mapToPk().deleteRule("cascade"),
    startsAt: p.datetime(), removedAt: p.datetime().nullable(),
  },
});
