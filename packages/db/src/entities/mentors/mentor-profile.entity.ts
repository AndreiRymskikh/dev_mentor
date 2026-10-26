import { defineEntity, p } from "@mikro-orm/postgresql";
import { User } from "../users/user.entity";

export const MentorProfile = defineEntity({
  name: "MentorProfile",
  tableName: "mentor_profiles",
  properties: {
    userId: p.manyToOne(User).fieldName("user_id").mapToPk().primary().deleteRule("restrict"),
    initialPublishDueAt: p.datetime().nullable(),
  },
});
