import { test, expect, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { createDatabaseRuntime, MentorCatalogRepository, type CatalogRecord } from "@devmentor/db";
import { MentorCatalogService } from "../packages/core/src/services/mentors/mentor-catalog.service";
import { readPricePolicy } from "../packages/core/src/services/prices/policy";
import { catalogListSchema } from "@devmentor/core/validators/mentors";
import { AppError } from "@devmentor/core/http";
import { createAppContainer } from "@devmentor/core/container";
import { GET, dynamic } from "../packages/app/src/app/api/mentors/route";
const id = randomUUID(), now = new Date("2026-11-08T12:00:00.000Z"), publishedAt = "2026-11-07T00:00:00.123456Z";
const source = {PLATFORM_CURRENCY: "PLN", PLATFORM_PRICE_BOUNDS: '{"25":{"minCents":9000,"maxCents":60000},"50":{"minCents":18000,"maxCents":120000}}'};
const policy = readPricePolicy(source);
const record: CatalogRecord = {id, publishedAt, slug: "mentor", displayName: "Mentor", bio: "Public bio", stackTags: ["react"], price25Cents: 9000, price50Cents: 18000, eligibleAt: new Date(now.getTime() + 7200000)};
test("catalog query is strict and bounded; continuation preserves microseconds and canonicalizes UUIDs", () => {
  expect(catalogListSchema.parse({})).toEqual({limit: 12});
  expect(catalogListSchema.parse({limit: "24", after: `${publishedAt}|${id.toUpperCase()}`})).toEqual({limit: 24, after: {publishedAt, id}});
  for (const input of [{limit: 0}, {limit: 25}, {limit: 1.5}, {limit: "bad"}, {view: "private"}, ...["", "x".repeat(101), `${publishedAt}|bad`, `bad|${id}`, `${publishedAt}|${id}|extra`, `2026-11-07T00:00:00.123Z|${id}`].map(after => ({after}))]) expect(catalogListSchema.safeParse(input).success).toBe(false);
});
test("catalog repository uses one bounded visibility/slot statement with bound cursor values", async () => {
  const runtime = createDatabaseRuntime(), execute = vi.fn().mockResolvedValue([{...record, eligibleAt: record.eligibleAt!.toISOString()}]);
  vi.spyOn(runtime, "withEntityManager").mockImplementation(async work => work({execute} as never));
  const repo = new MentorCatalogRepository(runtime);
  expect(await repo.list({limit: 1}, now)).toEqual([record]);
  expect(execute).toHaveBeenCalledWith(expect.stringContaining("u.email_verified_at is not null"), [null, null, null, 2, new Date(now.getTime()+7200000)]);
  await repo.list({limit: 24, after: {publishedAt, id}}, now);
  const [sql, args] = execute.mock.calls[1];
  expect(sql).toContain("r.role = 'mentor'"); expect(sql).toContain("removed_at is null"); expect(sql).toContain("p.published_at is not null");
  expect(sql).toContain("order by p.published_at desc, p.user_id desc limit ?"); expect(sql).toContain("(p.published_at, p.user_id) <"); expect(sql).toContain("order by starts_at asc limit 1");
  expect(args).toEqual([publishedAt, publishedAt, id, 25, new Date(now.getTime()+7200000)]);
  expect(sql).not.toContain(id); expect(sql).not.toContain(publishedAt);
  execute.mockResolvedValueOnce([{...record, eligibleAt: null}]); expect((await repo.list({limit: 1}, now))[0].eligibleAt).toBeNull();
});
test("service allowlists public fields, reuses policy, emits precise next cursor and earliest boundary", async () => {
  const list = vi.fn().mockResolvedValue([{...record, email: "private@example.test"}, {...record, slug: "later", eligibleAt: new Date(now.getTime()+10800000)}, record]);
  const service = new MentorCatalogService({list}, () => policy, () => now);
  const page = await service.list({limit: 2});
  expect(list).toHaveBeenCalledWith({limit: 2}, now); expect(page.nextCursor).toBe(`${publishedAt}|${id}`);
  expect(page.refreshAt).toBe(new Date(now.getTime()+1).toISOString()); expect(page.serverNow).toBe(now.toISOString());
  expect(Object.keys(page.items[0]).sort()).toEqual(["slug","displayName","bio","stackTags","offer"].sort());
  expect(page.items[0].stackTags).not.toBe(record.stackTags);
  expect(page.items[0].offer).toMatchObject({prices: {price25Cents: 9000, price50Cents: 18000, currency: "PLN"}, mentorOfferReady: true, bookingAvailable: false});
  expect(JSON.stringify(page.items)).not.toContain("private@example.test"); expect(JSON.stringify(page.items)).not.toContain(id);
  list.mockResolvedValueOnce([{...record, eligibleAt: null, price25Cents: null}]);
  expect(await service.list({})).toMatchObject({nextCursor: null, refreshAt: null, items: [{offer: {prices: null, readiness: {availability: false}, mentorOfferReady: false}}]});
  list.mockResolvedValueOnce([]); expect(await service.list({})).toEqual({items: [], nextCursor: null, serverNow: now.toISOString(), refreshAt: null});
  await expect(service.list({limit: 25})).rejects.toMatchObject({status: 422});
  for (const error of [new Error("secret"), new AppError("UNAVAILABLE", "Safe", 503)]) {
    list.mockRejectedValueOnce(error); await expect(service.list({})).rejects.toMatchObject({status: 503, message: error instanceof AppError ? "Safe" : expect.not.stringContaining("secret")});
  }
  vi.stubEnv("PLATFORM_CURRENCY", "PLN"); vi.stubEnv("PLATFORM_PRICE_BOUNDS", source.PLATFORM_PRICE_BOUNDS);
  list.mockResolvedValueOnce([]); await new MentorCatalogService({list}).list({}); expect(list.mock.calls.at(-1)?.[1]).toBeInstanceOf(Date); vi.unstubAllEnvs();
  await expect(new MentorCatalogService({list}, () => {throw new Error("policy unavailable");}).list({})).rejects.toThrow("policy unavailable");
});
test("public route rejects duplicate queries, returns no-store standard envelopes and uses scoped lazy services", async () => {
  const list = vi.spyOn(MentorCatalogService.prototype, "list").mockResolvedValue({items: [], nextCursor: null, serverNow: now.toISOString(), refreshAt: null});
  expect(dynamic).toBe("force-dynamic");
  for (const query of ["limit=1&limit=2", "after=a&after=b"]) expect((await GET(new Request(`https://site.test/api/mentors?${query}`))).status).toBe(422);
  expect(list).not.toHaveBeenCalled();
  const response = await GET(new Request("https://site.test/api/mentors?limit=2")); expect(response.status).toBe(200); expect(response.headers.get("cache-control")).toBe("no-store");
  expect(await response.json()).toMatchObject({ok: true, data: {items: []}}); expect(list).toHaveBeenCalledWith({limit: "2"});
  list.mockRejectedValueOnce(new AppError("UNAVAILABLE", "Try later", 503)); const failed = await GET(new Request("https://site.test/api/mentors")); expect(failed.status).toBe(503); expect(failed.headers.get("cache-control")).toBe("no-store");
  const container = createAppContainer(), a = container.createScope(), b = container.createScope();
  expect(a.cradle.mentorCatalogService).not.toBe(b.cradle.mentorCatalogService); expect(a.cradle.mentorCatalogRepository).not.toBe(b.cradle.mentorCatalogRepository);
  await a.dispose(); await b.dispose(); await container.dispose();
});
