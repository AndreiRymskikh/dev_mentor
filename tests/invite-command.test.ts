import { test, expect, vi } from "vitest";
import path from "node:path";
const mocks=vi.hoisted(()=>({create:vi.fn(),change:vi.fn(),close:vi.fn()}));
vi.mock("../packages/core/src/container",()=>({withScope:(work:(value:unknown)=>unknown)=>work({invitationService:{create:mocks.create,change:mocks.change}})}));
vi.mock("../packages/db/src",()=>({database:{close:mocks.close}}));
test("operator command validates explicit arguments and separates safe audit from one-time links",async()=>{
  const {runInvite}=await import("../scripts/invite.mts");const output=vi.fn();vi.stubEnv("APP_ORIGIN","http://localhost:3000");
  for(const args of [[],["create","bad label","a@test.test"],["other","ops","a@test.test"],["revoke","ops","id","tag"]])await expect(runInvite(args,output)).rejects.toThrow("Usage:");
  mocks.create.mockResolvedValue({id:"id",token:"token"});await runInvite(["create","ops","a@test.test","react"],output);expect(mocks.create).toHaveBeenCalledWith({email:"a@test.test",stackTags:["react"]});expect(output.mock.calls).toEqual([["invitation.create operator=ops id=id"],["http://localhost:3000/invitation/token"]]);
  mocks.change.mockResolvedValueOnce({id:"id",token:null}).mockResolvedValueOnce({id:"id",token:"new"});await runInvite(["revoke","ops","id"],output);await runInvite(["resend","ops","id"],output);expect(mocks.change).toHaveBeenCalledWith("id",false);expect(mocks.change).toHaveBeenCalledWith("id",true);
  for(const origin of [undefined,"file:///tmp","https://example.test/path"]){vi.stubEnv("APP_ORIGIN",origin);await expect(runInvite(["revoke","ops","id"],output)).rejects.toThrow();}
  vi.unstubAllEnvs();
});
test("entry point prints fixed failures, returns failure status, closes its pool and uses default output",async()=>{
  const argv=process.argv,exitCode=process.exitCode;const log=vi.spyOn(console,"log").mockImplementation(()=>{}),error=vi.spyOn(console,"error").mockImplementation(()=>{});vi.stubEnv("APP_ORIGIN","http://localhost:3000");
  try{process.argv=["node",path.resolve("scripts/invite.mts"),"create","ops","a@test.test"];mocks.create.mockResolvedValueOnce({id:"id",token:"token"});vi.resetModules();await import("../scripts/invite.mts");expect(log).toHaveBeenCalledWith("invitation.create operator=ops id=id");expect(mocks.close).toHaveBeenCalled();
    mocks.create.mockRejectedValueOnce(new Error("secret"));vi.resetModules();await import("../scripts/invite.mts");expect(process.exitCode).toBe(1);expect(error).toHaveBeenCalledWith("Invitation command failed. Check arguments, configuration and invitation state.");
    mocks.create.mockResolvedValueOnce({id:"id",token:"token"});mocks.close.mockRejectedValueOnce(new Error("private cleanup"));vi.resetModules();await import("../scripts/invite.mts");expect(error).toHaveBeenCalledWith("Database cleanup failed.");
    process.argv=[];vi.resetModules();await import("../scripts/invite.mts");
  }finally{process.argv=argv;process.exitCode=exitCode;vi.unstubAllEnvs();}
});
