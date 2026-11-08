import { database } from "../../runtime";
export interface CatalogQuery { limit: number; after?: { publishedAt: string; id: string } }
export interface CatalogRecord {
  id: string; publishedAt: string; slug: string; displayName: string; bio: string | null;
  stackTags: string[]; price25Cents: number | null; price50Cents: number | null; eligibleAt: Date | null;
}
/** A single statement checks visibility and bounds both mentor rows and slot lookups. */
export class MentorCatalogRepository {
  constructor(private readonly runtime = database) {}
  async list(query: CatalogQuery, now: Date): Promise<CatalogRecord[]> {
    return this.runtime.withEntityManager(async em => {
      // MikroORM raw SQL timestamps use driver strings rather than hydrated entity Dates.
      const records = await em.execute<(Omit<CatalogRecord, "eligibleAt"> & {eligibleAt: string | null})[]>(`
      with candidates as materialized (
        select p.user_id, p.published_at, p.slug, u.display_name, p.bio, p.stack_tags,
          p.price_25_cents, p.price_50_cents
        from mentor_profiles p
        join users u on u.id = p.user_id and u.email_verified_at is not null
        join user_roles r on r.user_id = p.user_id and r.role = 'mentor'
        where p.published_at is not null and p.slug is not null
          and (?::timestamptz is null or (p.published_at, p.user_id) < (?::timestamptz, ?::uuid))
        order by p.published_at desc, p.user_id desc limit ?
      )
      select p.user_id as id,
        to_char(p.published_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') as "publishedAt",
        p.slug, p.display_name as "displayName", p.bio, p.stack_tags as "stackTags",
        p.price_25_cents as "price25Cents", p.price_50_cents as "price50Cents", s.starts_at as "eligibleAt"
      from candidates p
      left join lateral (
        select starts_at from slots where mentor_profile_id = p.user_id and removed_at is null
          and starts_at >= ? order by starts_at asc limit 1
      ) s on true
      order by p.published_at desc, p.user_id desc
    `, [query.after?.publishedAt ?? null, query.after?.publishedAt ?? null, query.after?.id ?? null,
      query.limit + 1, new Date(now.getTime() + 7200000)]);
      return records.map(record => ({...record, eligibleAt: record.eligibleAt === null ? null : new Date(record.eligibleAt)}));
    });
  }
}
