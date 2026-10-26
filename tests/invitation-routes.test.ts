import { test, expect, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { InvitationService } from "../packages/core/src/services/invitations/invitation.service";
import { SessionService } from "../packages/core/src/services/users/session.service";
import { createAppContainer } from "@devmentor/core/container";
import { GET, dynamic } from "../packages/app/src/app/api/invitations/[token]/route";
import { POST } from "../packages/app/src/app/api/invitations/[token]/accept/route";
import { GET as onboarding } from "../packages/app/src/app/api/mentors/me/onboarding/route";
const id=randomUUID(), token="a".repeat(43), context={params:Promise.resolve({token})};
test("invitation routes preserve safe envelopes, CSRF, authenticated identity and existing cookies",async()=>{
  const lookup=vi.spyOn(InvitationService.prototype,"lookup").mockResolvedValue({email:"a@example.test",stackTags:[],expiresAt:"soon"});
  expect(dynamic).toBe("force-dynamic");const read=await GET(new Request("http://localhost"),context);expect(read.status).toBe(200);expect(read.headers.get("cache-control")).toBe("no-store");expect(lookup).toHaveBeenCalledWith(token);
  const resolve=vi.spyOn(SessionService.prototype,"resolve").mockResolvedValue(null); const accept=vi.spyOn(InvitationService.prototype,"accept");
  const request=(body="{}",csrf="1")=>new Request("http://localhost",{method:"POST",headers:{"Content-Type":"application/json","X-DevMentor-CSRF":csrf},body});
  expect((await POST(request(),context)).status).toBe(401);resolve.mockResolvedValue({id,displayName:"Invited",roles:["developer"]});
  expect((await POST(request("{}","0"),context)).status).toBe(403);
  for(const body of ["null","[]",'"bad"','{"role":"mentor"}'])expect((await POST(request(body),context)).status).toBe(400);
  accept.mockResolvedValue({initialPublishDueAt:"soon"});const response=await POST(request(),context);expect(response.status).toBe(200);expect(accept).toHaveBeenLastCalledWith(id,token);expect(response.headers.get("set-cookie")).toBeNull();
  const status=vi.spyOn(InvitationService.prototype,"onboarding").mockResolvedValue({initialPublishDueAt:null});expect((await onboarding(new Request("http://localhost"))).status).toBe(200);expect(status).toHaveBeenCalledWith(id);resolve.mockResolvedValue(null);await onboarding(new Request("http://localhost"));expect(status).toHaveBeenLastCalledWith(null);
  const container=createAppContainer();const a=container.createScope(),b=container.createScope();expect(a.cradle.invitationService).not.toBe(b.cradle.invitationService);expect(a.cradle.invitationRepository).not.toBe(b.cradle.invitationRepository);await a.dispose();await b.dispose();await container.dispose();
});
test("scoped invitation composition emits only a token-free acceptance event",async()=>{
  const {asValue}=await import("awilix");const container=createAppContainer(),scope=container.createScope();const accept=vi.fn().mockResolvedValue("ok");scope.register({invitationRepository:asValue({accept})});const info=vi.spyOn(scope.cradle.logger,"info").mockImplementation(()=>{});
  try{await scope.cradle.invitationService.accept(id,token);expect(accept).toHaveBeenCalledWith(id,expect.stringMatching(/^[a-f0-9]{64}$/),expect.any(Date),expect.any(Date));expect(info).toHaveBeenCalledWith({event:"invitations.invitation.accepted"},"Invitation accepted");expect(JSON.stringify(info.mock.calls)).not.toContain(token);}finally{await scope.dispose();await container.dispose();}
});
