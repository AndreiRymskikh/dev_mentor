import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import {MentorCatalogRepository, createDatabaseRuntime, databaseOptions} from "../../packages/db/src";
import {MentorCatalogService} from "../../packages/core/src/services/mentors/mentor-catalog.service";
import {readPricePolicy} from "../../packages/core/src/services/prices/policy";
/** Uses only the disposable connection supplied by the integration runner. */
export async function testMentorCatalog(clientUrl: string) {
  const runtime = createDatabaseRuntime(() => ({...databaseOptions(), clientUrl})), ids = Array.from({length: 7}, () => randomUUID()).sort().reverse();
  const now = new Date("2026-11-08T12:00:00Z"), publishedAt = "2026-11-07T00:00:00.123456Z";
  const service = new MentorCatalogService(new MentorCatalogRepository(runtime), () => readPricePolicy(), () => now);
  const sql = (statement: string, args: unknown[] = []) => runtime.withEntityManager(em => em.execute(statement, args));
  try {
    for (const [i, id] of ids.entries()) {
      await sql("insert into users(id,normalized_email,display_name,email_verified_at,created_at,updated_at) values(?,?,?, ?,now(),now())", [id, `catalog-${id}@example.test`, `Catalog ${i}`, i === 5 ? null : now]);
      if(i !== 4) await sql("insert into user_roles(user_id,role) values(?,'mentor')", [id]);
      await sql("insert into mentor_profiles(user_id,slug,published_at,bio,stack_tags,price_25_cents,price_50_cents) values(?,?,?,'Public catalog bio',ARRAY['react'],?,?)", [id, `catalog-${id}`, i === 6 ? null : publishedAt, i === 1 ? 1 : 9000, i === 2 ? null : 18000]);
    }
    // Active exact-boundary eligibility, removed future starts, past and too-close starts.
    for (const [i, delta, removed] of [[0,7200000,false],[1,14400000,true],[1,-1,false],[2,7199999,false]] as const)
      await sql("insert into slots(id,mentor_profile_id,starts_at,removed_at) values(?,?,?,?)",[randomUUID(),ids[i],new Date(now.getTime()+delta),removed?now:null]);
    const rawRows = await new MentorCatalogRepository(runtime).list({limit: 2}, now);
    assert.ok(rawRows[0].eligibleAt instanceof Date, `Eligible start must be Date, got ${typeof rawRows[0].eligibleAt}`);
    const first = await service.list({limit: 2}); assert.deepEqual(first.items.map(x=>x.displayName), ["Catalog 0", "Catalog 1"]);
    assert.equal(first.items[0].offer.mentorOfferReady, true); assert.equal(first.items[1].offer.prices, null); assert.equal(first.items[1].offer.readiness.availability, false);
    assert.equal(first.refreshAt, new Date(now.getTime()+1).toISOString()); assert.ok(first.nextCursor?.startsWith(publishedAt));
    assert.deepEqual(Object.keys(first.items[0]).sort(), ["bio","displayName","offer","slug","stackTags"]);
    // The anchor may be unpublished between pages without breaking continuation.
    await sql("update mentor_profiles set published_at=null where user_id=?",[ids[1]]);
    const second = await service.list({limit: 2, after: first.nextCursor}); assert.deepEqual(second.items.map(x=>x.displayName), ["Catalog 2", "Catalog 3"]); assert.equal(second.nextCursor,null);
    assert.equal(second.items[0].offer.prices,null); assert.equal(second.items[0].offer.readiness.availability,false);
    const expired = new MentorCatalogService(new MentorCatalogRepository(runtime), () => readPricePolicy(), () => new Date(now.getTime()+1)); assert.equal((await expired.list({})).items[0].offer.readiness.availability,false);
    await sql("delete from user_roles where user_id=?",[ids[0]]); assert.equal((await service.list({})).items.some(x=>x.displayName === "Catalog 0"),false);
    await sql("update users set email_verified_at=null where id=?",[ids[2]]); assert.deepEqual((await service.list({})).items.map(x=>x.displayName),["Catalog 3"]);
    await sql("update mentor_profiles set published_at=null where user_id=?",[ids[3]]); assert.deepEqual((await service.list({})).items,[]);
  } finally {
    for (const statement of ["delete from slots where mentor_profile_id = ?", "delete from mentor_profiles where user_id = ?", "delete from user_roles where user_id = ?", "delete from users where id = ?"]) {
      for (const id of ids) await sql(statement, [id]);
    }
    await runtime.close();
  }
}
