import { test, expect, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { InvitationRepository, createDatabaseRuntime, User, UserRole, Invitation, MentorProfile } from "@devmentor/db";
import { UniqueConstraintViolationException } from "@mikro-orm/postgresql";
import { InvitationService } from "../packages/core/src/services/invitations/invitation.service";
import { mintOpaqueToken, hashToken } from "../packages/core/src/services/invitations/token.service";
import { readEnv } from "../packages/core/src/config/env";
import { Migration202610260001 } from "../packages/db/src/migrations/Migration202610260001";
const id = randomUUID(), token = "a".repeat(43), now = new Date("2026-10-26T12:00:00Z");
const input = { email: " Test@Example.test ", stackTags: ["react"] };
function fixture() {
  const repo = { create: vi.fn().mockResolvedValue("ok"), lookup: vi.fn().mockResolvedValue({ email: "test@example.test", stackTags: ["react"], expiresAt: now.toISOString() }), accept: vi.fn().mockResolvedValue("ok"), change: vi.fn().mockResolvedValue("ok"), onboarding: vi.fn().mockResolvedValue({ initialPublishDueAt: null }), identity: vi.fn().mockResolvedValue("test@example.test") };
  const emit = vi.fn(); const service = new InvitationService(repo, () => now, () => readEnv({}), emit);
  return { repo, service, emit };
}
test("opaque invitation tokens use 256 random bits and deterministic nonreversible digests", () => {
  const a = mintOpaqueToken(), b = mintOpaqueToken(); expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/); expect(a).not.toBe(b); expect(hashToken(a)).toMatch(/^[a-f0-9]{64}$/); expect(hashToken(a)).toBe(hashToken(a)); expect(hashToken(a)).not.toBe(hashToken(b));
});
test("service validates normalized explicit inputs and maps each transactional outcome safely", async () => {
  const { repo, service, emit } = fixture();
  const result = await service.create(input); expect(result.id).toMatch(/^[a-f0-9-]{36}$/); expect(result.token).toHaveLength(43);
  expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ email: "test@example.test", stackTags: ["react"], createdAt: now, expiresAt: new Date("2026-11-09T12:00:00Z"), tokenHash: hashToken(result.token) }));
  for (const value of [{}, { ...input, extra: true }, { ...input, stackTags: ["react", "react"] }, { ...input, stackTags: ["other"] }]) await expect(service.create(value)).rejects.toMatchObject({ status: 400 });
  for (const [status, http] of [["not-found",404],["forbidden",403],["conflict",409]] as const) { repo.create.mockResolvedValueOnce(status); await expect(service.create(input)).rejects.toMatchObject({ status: http }); }
  repo.create.mockRejectedValueOnce(new Error("private")); await expect(service.create(input)).rejects.toMatchObject({ status: 503 });
  expect(await service.lookup(token)).toMatchObject({ email: "test@example.test" }); await expect(service.lookup("bad")).rejects.toMatchObject({ status: 404 }); repo.lookup.mockResolvedValueOnce(null); await expect(service.lookup(token)).rejects.toMatchObject({ status: 404 });
  const { ForbiddenError } = await import("@devmentor/core/http"); repo.lookup.mockRejectedValueOnce(new ForbiddenError()); await expect(service.lookup(token)).rejects.toMatchObject({status:403});
  for (const actor of [null,"bad"]) await expect(service.accept(actor, token)).rejects.toMatchObject({ status: 401 });
  await expect(service.accept(id, "bad")).rejects.toMatchObject({ status: 404 });
  expect(await service.accept(id.toUpperCase(), token)).toEqual({ publishDueAt: "2026-11-09T12:00:00.000Z" }); expect(repo.accept).toHaveBeenCalledWith(id, hashToken(token), now, new Date("2026-11-09T12:00:00Z")); expect(emit).toHaveBeenCalledWith("invitations.invitation.accepted");
  await expect(service.change("bad", false)).rejects.toMatchObject({ status: 400 });
  expect(await service.change(id, false)).toEqual({ id, token: null }); expect(repo.change).toHaveBeenLastCalledWith(id, now, undefined);
  const rotated = await service.change(id.toUpperCase(), true); expect(rotated.token).toHaveLength(43); expect(repo.change).toHaveBeenLastCalledWith(id, now, { tokenHash: hashToken(rotated.token!), expiresAt: new Date("2026-11-09T12:00:00Z") });
  await expect(service.onboarding(null)).rejects.toMatchObject({ status: 401 }); repo.onboarding.mockResolvedValueOnce(null); await expect(service.onboarding(id)).rejects.toMatchObject({ status:403 }); expect(await service.onboarding(id)).toEqual({initialPublishDueAt:null}); expect(await service.identity(id)).toBe("test@example.test");
});
test("default clock/settings/event hook work without module-load configuration", async () => {
  const { repo } = fixture(); const service = new InvitationService(repo); await service.create(input); await service.accept(id,token); await service.change(id,true);
  expect(repo.create.mock.calls[0][0].createdAt).toBeInstanceOf(Date);
  expect(readEnv({}).INVITATION_TTL_DAYS).toBe(14); expect(readEnv({ INVITATION_TTL_DAYS:"7", MENTOR_PUBLISH_WINDOW_DAYS:"30" })).toMatchObject({ INVITATION_TTL_DAYS:7, MENTOR_PUBLISH_WINDOW_DAYS:30 });
  for (const value of ["0", "366", "1.2", "bad"]) expect(() => readEnv({ INVITATION_TTL_DAYS:value })).toThrow("Invalid server");
});
test("schema migration is additive, maps text arrays and refuses destructive rollback", () => {
  const migration = Object.create(Migration202610260001.prototype) as Migration202610260001; const addSql = vi.fn(); migration.addSql = addSql; migration.up();
  expect(addSql.mock.calls.map(c=>c[0]).join("\n")).toContain('"stack_tags" text[]'); expect(addSql.mock.calls.map(c=>c[0]).join("\n")).toContain("where accepted_at is null and revoked_at is null");
  migration.down(); expect(addSql).toHaveBeenCalledWith(expect.stringContaining("Refusing destructive mentor rollback"));
});
test("persistence locks user before token and denies every invalid invitation/identity state", async () => {
  const runtime=createDatabaseRuntime(); const findOne=vi.fn(),create=vi.fn((_entity, value)=>value),flush=vi.fn(),upsert=vi.fn(); const em={findOne,create,flush,upsert};
  vi.spyOn(runtime,"transaction").mockImplementation(async work=>work(em as never)); vi.spyOn(runtime,"withEntityManager").mockImplementation(async work=>work(em as never));
  const repo=new InvitationRepository(runtime); new InvitationRepository();
  let user: {id:string;normalizedEmail:string;emailVerifiedAt:Date|null}|null={id,normalizedEmail:"test@example.test",emailVerifiedAt:now}; let mentor=false, developer=true;
  const row={id,email:"test@example.test",tokenHash:hashToken(token),stackTags:["react"],expiresAt:new Date(now.getTime()+1000),acceptedAt:null as Date|null,revokedAt:null as Date|null,acceptedById:null as string|null,publishDueAt:null as Date|null}; let invitation: typeof row|null={...row}; let profile: {userId:string;initialPublishDueAt?:Date|null}|null=null;
  findOne.mockImplementation(async (entity,query)=>entity===User?user:entity===UserRole?(query.role==="mentor"?mentor:developer)?{role:query.role}:null:entity===Invitation?invitation:profile);
  const record={id,email:row.email,tokenHash:row.tokenHash,stackTags:row.stackTags,createdAt:now,expiresAt:row.expiresAt};
  expect(await repo.create(record)).toBe("ok"); mentor=true;expect(await repo.create(record)).toBe("conflict");mentor=false;user=null;expect(await repo.create(record)).toBe("ok");
  flush.mockRejectedValueOnce(new UniqueConstraintViolationException(new Error("duplicate")));expect(await repo.create(record)).toBe("conflict");flush.mockRejectedValueOnce(new Error("offline"));await expect(repo.create(record)).rejects.toThrow("offline");
  expect(await repo.lookup(row.tokenHash,now)).toEqual({email:row.email,stackTags:row.stackTags,expiresAt:row.expiresAt.toISOString()});invitation=null;expect(await repo.lookup(row.tokenHash,now)).toBeNull();
  for(const value of [null,{...row,acceptedAt:now},{...row,revokedAt:now},{...row,expiresAt:now}]){invitation=value;expect(await repo.accept(id,row.tokenHash,now,now)).toBe("not-found");}
  invitation={...row};for(const value of [null,{id,normalizedEmail:row.email,emailVerifiedAt:null},{id,normalizedEmail:"other@example.test",emailVerifiedAt:now}]){user=value;expect(await repo.accept(id,row.tokenHash,now,now)).toBe("forbidden");}
  user={id,normalizedEmail:row.email,emailVerifiedAt:now};developer=false;expect(await repo.accept(id,row.tokenHash,now,now)).toBe("forbidden");developer=true;
  const due=new Date(now.getTime()+86400000);findOne.mockClear();expect(await repo.accept(id,row.tokenHash,now,due)).toBe("ok");expect(findOne.mock.calls[0][0]).toBe(User);expect(findOne.mock.calls[1][0]).toBe(Invitation);expect(invitation).toMatchObject({acceptedAt:now,acceptedById:id,publishDueAt:due});expect(create).toHaveBeenCalledWith(MentorProfile,{userId:id,initialPublishDueAt:due});
  profile={userId:id,initialPublishDueAt:now};invitation={...row};expect(await repo.accept(id,row.tokenHash,now,due)).toBe("ok");expect(profile.initialPublishDueAt).toBe(now);
  profile={userId:id,initialPublishDueAt:null};invitation={...row};expect(await repo.accept(id,row.tokenHash,now,due)).toBe("ok");expect(profile.initialPublishDueAt).toBe(due);
  for(const value of [null,{...row,acceptedAt:now},{...row,revokedAt:now}]){invitation=value;expect(await repo.change(id,now)).toBe("not-found");}
  invitation={...row};expect(await repo.change(id,now)).toBe("ok");expect(invitation.revokedAt).toBe(now);
  invitation={...row};expect(await repo.change(id,now,{tokenHash:"b".repeat(64),expiresAt:due})).toBe("ok");expect(invitation).toMatchObject({tokenHash:"b".repeat(64),expiresAt:due,revokedAt:null});
  expect(await repo.identity(id)).toBe(row.email);user=null;expect(await repo.identity(id)).toBeNull();expect(await repo.onboarding(id)).toBeNull();user={id,normalizedEmail:row.email,emailVerifiedAt:null};expect(await repo.onboarding(id)).toBeNull();user.emailVerifiedAt=now;mentor=false;expect(await repo.onboarding(id)).toBeNull();mentor=true;profile=null;expect(await repo.onboarding(id)).toEqual({initialPublishDueAt:null});profile={userId:id,initialPublishDueAt:null};expect(await repo.onboarding(id)).toEqual({initialPublishDueAt:null});profile.initialPublishDueAt=due;expect(await repo.onboarding(id)).toEqual({initialPublishDueAt:due.toISOString()});
});
