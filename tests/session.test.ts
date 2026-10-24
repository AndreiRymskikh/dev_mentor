import { test, expect, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { hash, compare } from "bcryptjs";
import { SignJWT } from "jose";
import { SessionJwt, SESSION_SECONDS } from "../packages/core/src/services/sessions/jwt";
import { SessionService } from "../packages/core/src/services/users/session.service";
import { SessionRepository, createDatabaseRuntime, User, AuthSession } from "@devmentor/db";
import { RateLimitService } from "../packages/core/src/services/limits/rate-limit.service";
import { requireSession } from "@devmentor/core/http";
import { createAppContainer } from "@devmentor/core/container";
import { POST as login, dynamic as ld } from "../packages/app/src/app/api/auth/login/route";
import { POST as logout, dynamic as od } from "../packages/app/src/app/api/auth/logout/route";
import { GET as session, dynamic as sd } from "../packages/app/src/app/api/auth/session/route";
import { sessionCookie, readSessionCookie } from "../packages/app/src/auth/session-cookie";
const secret = "s".repeat(32); const uid = randomUUID(); const sid = randomUUID();
test("JWT cryptographic validation pins every claim, key, algorithm and absolute expiry", async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-23T10:00:00.000Z"));
  try {
  const jwt = new SessionJwt(() => secret); const now = Math.floor(Date.now()/1000);
  const token = await jwt.sign(uid,sid,now); expect(await jwt.verify(token)).toEqual({ userId: uid, sessionId: sid });
  const base = { sub: uid, sid, iss: "devmentor", aud: "devmentor-session", iat: now, exp: now + SESSION_SECONDS };
  const mint = (claims: Record<string, unknown>, alg = "HS256") => new SignJWT(claims).setProtectedHeader({ alg, typ: "JWT" }).sign(new TextEncoder().encode(secret));
  for (const patch of [{ sub: "bad" }, { sid: "bad" }, { iss: "bad" }, { aud: "bad" }, { exp: now - 1 }, { exp: now + 10 }, { iat: now + 1, exp: now + SESSION_SECONDS + 1 }, { iat: 1.5 }, { exp: 1.5 }]) expect(await jwt.verify(await mint({ ...base, ...patch }))).toBeNull();
  for (const key of ["sub","sid","iat","exp"]) { const claims: Record<string, unknown> = { ...base }; delete claims[key]; expect(await jwt.verify(await mint(claims))).toBeNull(); }
  expect(await jwt.verify(await mint(base,"HS384"))).toBeNull();
  for (const value of ["bad", "a".repeat(2049), token.slice(0,-8)+"aaaaaaaa"]) expect(await jwt.verify(value)).toBeNull();
  for (const value of [undefined, "short"]) { const broken = new SessionJwt(() => value); await expect(broken.sign(uid,sid,now)).rejects.toMatchObject({ status:503 }); await expect(broken.verify(token)).rejects.toMatchObject({ status:503 }); }
  vi.stubEnv("JWT_SECRET",secret); expect(await new SessionJwt().verify(token)).toEqual({ userId:uid, sessionId:sid }); vi.unstubAllEnvs();
  } finally { vi.useRealTimers(); vi.unstubAllEnvs(); }
});
test("login validates, compares even missing credentials, rechecks hash under lock, maps outages", async () => {
  const passwordHash = await hash("long-password",12); const principal = { id:uid, displayName:"Name",roles:["developer"] as const };
  const repository = { credentials:vi.fn().mockResolvedValue({ userId:uid,passwordHash }),create:vi.fn().mockResolvedValue(principal),resolve:vi.fn().mockResolvedValue(principal),revoke:vi.fn() };
  const limits = { login:vi.fn() }; const jwt = new SessionJwt(() => secret); const service = new SessionService(repository,limits,jwt); const input = { email:"a@example.test",password:"long-password" };
  await expect(service.login({ ...input,roles:["administrator"] },"ip")).rejects.toMatchObject({ status:400 });
  const result = await service.login(input,"ip"); expect(result.principal).toEqual(principal); expect(await jwt.verify(result.token)).toMatchObject({ userId:uid });
  for (const password of ["bad", "x".repeat(73),"long-password"+"x".repeat(80)]) await expect(service.login({ ...input,password },"ip")).rejects.toMatchObject({ status:401 });
  repository.credentials.mockResolvedValueOnce(null); await expect(service.login(input,"ip")).rejects.toMatchObject({ status:401 });
  repository.create.mockResolvedValueOnce(null); await expect(service.login(input,"ip")).rejects.toMatchObject({ status:401 });
  repository.credentials.mockRejectedValueOnce(new Error("secret")); await expect(service.login(input,"ip")).rejects.toMatchObject({ status:503 });
  expect(await service.resolve(null)).toBeNull(); expect(await service.resolve("invalid")).toBeNull(); expect(await service.resolve(result.token)).toEqual(principal);
  repository.resolve.mockRejectedValueOnce(new Error()); await expect(service.resolve(result.token)).rejects.toMatchObject({ status:503 });
  await service.logout(null); await service.logout("invalid"); await service.logout(result.token); expect(repository.revoke).toHaveBeenCalledOnce();
  repository.revoke.mockRejectedValueOnce(new Error()); await expect(service.logout(result.token)).rejects.toMatchObject({ status:503 });
  expect(await compare("x","$2b$12$abcdefghijklmnopqrstuuH9fQ3Hh2rK3fb7Z5myZEH5Z7q9ZW9yG")).toBe(false);
});
test("repository returns allowlists and locks user before checking hash", async () => {
  const runtime = createDatabaseRuntime(); const findOne = vi.fn(); const find=vi.fn().mockResolvedValue([{role:"developer"}]); const create=vi.fn(); const flush=vi.fn(); const nativeUpdate=vi.fn();
  const em={ findOne, find, create, flush, nativeUpdate }; vi.spyOn(runtime,"withEntityManager").mockImplementation(async work => work(em as never)); vi.spyOn(runtime,"transaction").mockImplementation(async work => work(em as never));
  const repo=new SessionRepository(runtime); const user={id:uid,displayName:"Name",emailVerifiedAt:new Date(),normalizedEmail:"private"}; const cred={passwordHash:"hash"};
  findOne.mockResolvedValueOnce(null); expect(await repo.credentials("missing")).toBeNull();
  findOne.mockResolvedValueOnce(user).mockResolvedValueOnce(null); expect(await repo.credentials("missing")).toBeNull();
  findOne.mockResolvedValueOnce(user).mockResolvedValueOnce(cred); expect(await repo.credentials("email")).toEqual({userId:uid,passwordHash:"hash"});
  for(const pair of [[null,cred],[{...user,emailVerifiedAt:null},cred],[user,null],[user,{passwordHash:"stale"}]]) { findOne.mockResolvedValueOnce(pair[0]).mockResolvedValueOnce(pair[1]); expect(await repo.create(uid,"hash",sid,new Date())).toBeNull(); }
  findOne.mockResolvedValueOnce(user).mockResolvedValueOnce(cred); expect(await repo.create(uid,"hash",sid,new Date())).toEqual({id:uid,displayName:"Name",roles:["developer"]}); expect(findOne.mock.calls.at(-2)).toEqual([User,{id:uid},{lockMode:expect.anything()}]); expect(create).toHaveBeenCalledWith(AuthSession,expect.objectContaining({id:sid,userId:uid}));
  findOne.mockResolvedValueOnce(null); expect(await repo.resolve(uid,sid)).toBeNull(); findOne.mockResolvedValueOnce({}).mockResolvedValueOnce(null); expect(await repo.resolve(uid,sid)).toBeNull();
  findOne.mockResolvedValueOnce({}).mockResolvedValueOnce(user); expect(await repo.resolve(uid,sid)).toEqual({id:uid,displayName:"Name",roles:["developer"]}); await repo.revoke(uid,sid); expect(nativeUpdate).toHaveBeenCalledWith(AuthSession,{id:sid,userId:uid,revokedAt:null},{revokedAt:expect.any(Date)});
});
test("login quotas separate pair/IP and keep 15-minute windows", async () => { const consume=vi.fn().mockResolvedValue({allowed:true}); const limits=new RateLimitService({consume},()=>secret); await limits.login("a@example.test","ip"); expect(consume).toHaveBeenCalledWith([{keyDigest:expect.any(String),limit:5,windowSeconds:900},{keyDigest:expect.any(String),limit:50,windowSeconds:900}]); expect(consume.mock.calls[0][0][0].keyDigest).not.toEqual(consume.mock.calls[0][0][1].keyDigest); });
test("cookies, routes and DI keep token transport private and no-store",async()=>{
  const principal={id:uid,displayName:"Name",roles:["developer"] as const};const request=(method="POST",cookie?:string,csrf="1")=>new Request("http://localhost/api/auth",{method,headers:{"content-type":"application/json","X-DevMentor-CSRF":csrf,...(cookie?{cookie}:{})},...(method==="POST"?{body:JSON.stringify({email:"a@example.test",password:"password"})}:{})});
  vi.stubEnv("NODE_ENV","production"); expect(sessionCookie("raw")).toBe("__Host-devmentor-session=raw; HttpOnly; SameSite=Lax; Path=/; Max-Age=86400; Secure");expect(sessionCookie(null)).toContain("Max-Age=0; Secure");vi.stubEnv("NODE_ENV","development");expect(sessionCookie(null)).not.toContain("Secure");
  expect(readSessionCookie(request())).toBeNull();expect(readSessionCookie(request("GET","devmentor-session=abc"))).toBe("abc");expect(readSessionCookie(request("GET","devmentor-session=a; devmentor-session=b"))).toBeNull();
  const l=vi.spyOn(SessionService.prototype,"login").mockResolvedValue({principal,token:"raw"});const r=vi.spyOn(SessionService.prototype,"resolve").mockResolvedValue(principal);const o=vi.spyOn(SessionService.prototype,"logout").mockResolvedValue({message:"Logged out."});
  try {expect([ld,od,sd]).toEqual(["force-dynamic","force-dynamic","force-dynamic"]);expect((await login(request("POST",undefined,"0"))).status).toBe(403);expect((await logout(request("POST",undefined,"0"))).status).toBe(403);const response=await login(request());expect(await response.json()).toEqual({ok:true,data:principal});expect(response.headers.get("set-cookie")).toContain("raw");expect(l).toHaveBeenCalledWith({email:"a@example.test",password:"password"},"shared-untrusted-peer");for(const res of [response,await session(request("GET")),await logout(new Request("http://localhost/api/auth/logout",{method:"POST",headers:{"X-DevMentor-CSRF":"1"}}))])expect(res.headers.get("cache-control")).toBe("no-store");r.mockResolvedValueOnce(null);expect((await session(request("GET"))).status).toBe(401);
    for(const body of ["{}",'{"userId":"forged"}',"{",'"bad"']) { const out=await logout(new Request("http://localhost/api/auth/logout",{method:"POST",headers:{"X-DevMentor-CSRF":"1","content-type":"application/json"},body}));expect(out.status).toBe(body==="{}"?200:400); }
    expect((await logout(new Request("http://localhost/api/auth/logout",{method:"POST",headers:{"X-DevMentor-CSRF":"1","content-type":"text/plain"},body:"{}"}))).status).toBe(400);}finally{l.mockRestore();r.mockRestore();o.mockRestore();vi.unstubAllEnvs();}
  const container=createAppContainer();const a=container.createScope(),b=container.createScope();expect(a.cradle.sessionService).not.toBe(b.cradle.sessionService);expect(a.cradle.sessionRepository).not.toBe(b.cradle.sessionRepository);await a.dispose();await b.dispose();await container.dispose();
  for(const roles of [undefined,["admin"],[123],"mentor"])await expect(requireSession(request(),async()=>({userId:uid,roles} as never))).rejects.toMatchObject({status:401});
});
