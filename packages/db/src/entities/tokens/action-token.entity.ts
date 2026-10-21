import { defineEntity, p } from "@mikro-orm/postgresql";
import { User } from "../users/user.entity";

export const ActionToken = defineEntity({
  name: "ActionToken",
  tableName: "action_tokens",
  checks: [
    { name: "action_tokens_digest_check", expression: "digest ~ '^[a-f0-9]{64}$'" },
  ],
  properties: {
    id: p.uuid().primary(),
    userId: p.manyToOne(User).fieldName("user_id").mapToPk().deleteRule("restrict").index(),
    purpose: p.enum(["verify-email", "reset-password"]),
    digest: p.string().length(64).unique().hidden(),
    expiresAt: p.datetime().index(),
    consumedAt: p.datetime().nullable(),
  },
});
