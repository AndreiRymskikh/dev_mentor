import { database } from "../../runtime";

export interface RateLimitRequest { keyDigest: string; limit: number; windowSeconds?: 900 | 3600 }
export interface RateLimitResult { allowed: boolean; retryAfterSeconds: number }

export class RateLimitRepository {
  constructor(private readonly runtime = database) {}

  /** PostgreSQL chooses the fixed window; atomic upserts serialize competing instances. */
  async consume(requests: readonly RateLimitRequest[]): Promise<RateLimitResult> {
    return this.runtime.transaction(async (em) => {
      let allowed = true;
      let retryAfterSeconds = 1;
      // Stable lock order avoids deadlocks for overlapping address/IP pairs.
      for (const request of [...requests].sort((a, b) => a.keyDigest.localeCompare(b.keyDigest))) {
        const [row] = await em.execute<{ attempt_count: number; retry_after: number }[]>(
          `insert into rate_limit_buckets (key_digest, window_start, attempt_count, expires_at)
           values (?, to_timestamp(floor(extract(epoch from statement_timestamp()) / ?) * ?), 1, to_timestamp((floor(extract(epoch from statement_timestamp()) / ?) + 1) * ?))
           on conflict (key_digest, window_start) do update
           set attempt_count = least(rate_limit_buckets.attempt_count + 1, ?)
           returning attempt_count, ceil(extract(epoch from (expires_at - statement_timestamp())))::integer as retry_after`,
          [request.keyDigest, request.windowSeconds ?? 3600, request.windowSeconds ?? 3600, request.windowSeconds ?? 3600, request.windowSeconds ?? 3600, request.limit + 1],
        );
        if (row.attempt_count > request.limit) allowed = false;
        retryAfterSeconds = Math.max(retryAfterSeconds, row.retry_after);
      }
      return { allowed, retryAfterSeconds };
    });
  }
}
