import { defineEntity, p } from "@mikro-orm/postgresql";
import { User } from "../users/user.entity";

export const AuthSession = defineEntity({
  name: "AuthSession",
  tableName: "auth_sessions",
  properties: {
    id: p.uuid().primary(),
    userId: p.manyToOne(User).fieldName("user_id").mapToPk().deleteRule("restrict").index(),
    expiresAt: p.datetime().index(),
    revokedAt: p.datetime().nullable(),
  },
});
