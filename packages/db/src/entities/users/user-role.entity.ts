import { defineEntity, p } from "@mikro-orm/postgresql";
import { User } from "./user.entity";

export const UserRole = defineEntity({
  name: "UserRole",
  tableName: "user_roles",
  properties: {
    userId: p.manyToOne(User).fieldName("user_id").mapToPk().primary().deleteRule("restrict"),
    role: p.enum(["developer", "mentor", "administrator"]).primary(),
  },
});
