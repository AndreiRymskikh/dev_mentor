import { database } from "../../runtime";

export interface AuthMaintenanceCounts { sessions: number; tokens: number; buckets: number }
/** One invocation deletes at most 500 expired rows per table (1500 total). */
export class AuthMaintenanceRepository {
  constructor(private readonly runtime = database) {}
  async removeExpired(): Promise<AuthMaintenanceCounts> {
    return this.runtime.transaction(async (em) => {
      await em.execute("set local statement_timeout = '5s'");
      await em.execute("set local lock_timeout = '1s'");
      // Fixed SQL only. The shared database transaction timestamp is the cutoff;
      // skipped locks preserve in-flight operations without waiting on their rows.
      const sessions = await em.execute<{ id: string }[]>(`delete from auth_sessions where id in
        (select id from auth_sessions where expires_at <= transaction_timestamp()
         order by expires_at, id limit 500 for update skip locked) returning id`);
      const tokens = await em.execute<{ id: string }[]>(`delete from action_tokens where id in
        (select id from action_tokens where expires_at <= transaction_timestamp()
         order by expires_at, id limit 500 for update skip locked) returning id`);
      const buckets = await em.execute<{ key_digest: string }[]>(`delete from rate_limit_buckets where (key_digest, window_start) in
        (select key_digest, window_start from rate_limit_buckets where expires_at <= transaction_timestamp()
         order by expires_at, key_digest, window_start limit 500 for update skip locked) returning key_digest`);
      return { sessions: sessions.length, tokens: tokens.length, buckets: buckets.length };
    });
  }
}
