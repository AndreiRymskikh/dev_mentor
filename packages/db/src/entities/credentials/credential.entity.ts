import { defineEntity, p } from "@mikro-orm/postgresql";
import { User } from "../users/user.entity";

export const Credential = defineEntity({
  name: "Credential",
  tableName: "credentials",
  checks: [
    { name: "credentials_password_hash_check", expression: "password_hash ~ '^\\$2[aby]\\$(1[2-9]|2[0-9]|3[01])\\$[./A-Za-z0-9]{53}$'" },
  ],
  properties: {
    userId: p.manyToOne(User).fieldName("user_id").mapToPk().primary().deleteRule("restrict"),
    passwordHash: p.string().length(60).hidden(),
    passwordChangedAt: p.datetime(),
  },
});
