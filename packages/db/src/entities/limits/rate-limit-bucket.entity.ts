import { defineEntity, p } from "@mikro-orm/postgresql";

export const RateLimitBucket = defineEntity({
  name: "RateLimitBucket",
  tableName: "rate_limit_buckets",
  checks: [
    { name: "rate_limit_buckets_key_digest_check", expression: "key_digest ~ '^[a-f0-9]{64}$'" },
    { name: "rate_limit_buckets_attempt_count_check", expression: "attempt_count >= 0" },
  ],
  properties: {
    keyDigest: p.string().length(64).primary().hidden(),
    windowStart: p.datetime().primary(),
    attemptCount: p.integer(),
    expiresAt: p.datetime().index(),
  },
});
