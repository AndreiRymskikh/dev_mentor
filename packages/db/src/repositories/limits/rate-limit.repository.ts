import { database } from "../../runtime";

export interface RateLimitRequest { keyDigest: string; limit: number }
export interface RateLimitResult { allowed: boolean; retryAfterSeconds: number }

export class RateLimitRepository {
  constructor(private readonly runtime = database) {}

  /** PostgreSQL chooses the hour; atomic upserts serialize competing instances. */
  async consume(requests: readonly RateLimitRequest[]): Promise<RateLimitResult> {
    return this.runtime.transaction(async (em) => {
      let allowed = true;
      let retryAfterSeconds = 1;
      // Stable lock order avoids deadlocks for overlapping address/IP pairs.
      for (const request of [...requests].sort((a, b) => a.keyDigest.localeCompare(b.keyDigest))) {
        const [row] = await em.execute<{ attempt_count: number; retry_after: number }[]>(
          `insert into rate_limit_buckets (key_digest, window_start, attempt_count, expires_at)
           values (?, date_trunc('hour', statement_timestamp()), 1, date_trunc('hour', statement_timestamp()) + interval '1 hour')
           on conflict (key_digest, window_start) do update
           set attempt_count = least(rate_limit_buckets.attempt_count + 1, ?)
           returning attempt_count, ceil(extract(epoch from (expires_at - statement_timestamp())))::integer as retry_after`,
          [request.keyDigest, request.limit + 1],
        );
        if (row.attempt_count > request.limit) allowed = false;
        retryAfterSeconds = Math.max(retryAfterSeconds, row.retry_after);
      }
      return { allowed, retryAfterSeconds };
    });
  }
}
