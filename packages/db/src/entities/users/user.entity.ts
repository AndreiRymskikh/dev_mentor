import { defineEntity, p } from "@mikro-orm/postgresql";

export const User = defineEntity({
  name: "User",
  tableName: "users",
  checks: [
    { name: "users_normalized_email_check", expression: "normalized_email = lower(btrim(normalized_email)) and length(normalized_email) > 0" },
    { name: "users_display_name_check", expression: "length(btrim(display_name)) > 0" },
  ],
  properties: {
    id: p.uuid().primary(),
    normalizedEmail: p.string().length(254).unique(),
    displayName: p.string().length(100),
    emailVerifiedAt: p.datetime().nullable(),
    createdAt: p.datetime(),
    updatedAt: p.datetime(),
  },
});
