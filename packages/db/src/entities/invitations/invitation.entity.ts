import { defineEntity, p } from "@mikro-orm/postgresql";
import { User } from "../users/user.entity";

export const Invitation = defineEntity({
  name: "Invitation",
  tableName: "invitations",
  checks: [
    { name: "invitations_email_check", expression: "email = lower(btrim(email)) and length(email) > 0" },
    { name: "invitations_token_hash_check", expression: "token_hash ~ '^[a-f0-9]{64}$'" },
    { name: "invitations_stack_tags_check", expression: "stack_tags <@ ARRAY['typescript','react','python','ai-agents']::text[] and array_position(stack_tags, null) is null" },
    { name: "invitations_acceptance_check", expression: "((accepted_at is null) = (accepted_by_id is null)) and ((accepted_at is null) = (publish_due_at is null)) and (accepted_at is null or revoked_at is null)" },
  ],
  indexes: [{ name: "invitations_pending_email_unique", expression: "create unique index invitations_pending_email_unique on invitations (email) where accepted_at is null and revoked_at is null" }],
  properties: {
    id: p.uuid().primary(),
    email: p.string().length(254),
    tokenHash: p.string().length(64).unique().hidden(),
    stackTags: p.array<string>(),
    createdAt: p.datetime(),
    expiresAt: p.datetime(),
    acceptedAt: p.datetime().nullable(),
    acceptedById: p.manyToOne(User).fieldName("accepted_by_id").mapToPk().nullable().deleteRule("restrict"),
    publishDueAt: p.datetime().nullable(),
    revokedAt: p.datetime().nullable(),
  },
});
