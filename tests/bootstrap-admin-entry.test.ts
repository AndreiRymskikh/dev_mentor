import { test, expect, vi } from "vitest";
const mocks=vi.hoisted(()=>({close:vi.fn(),run:vi.fn()}));
vi.mock("../packages/db/src/index",()=>({database:{close:mocks.close},RolesRepository:class {}}));
vi.mock("../packages/core/src/services/users/roles.service",()=>({RolesService:class {}}));
vi.mock("../packages/core/src/operators/bootstrap-admin",()=>({bootstrapAdmin:mocks.run}));
test("operator process forwards UUID arguments, returns runner status and always closes owned pool",async()=>{
  const previous=process.exitCode,argv=process.argv;const error=vi.spyOn(console,"error").mockImplementation(()=>{});
  try {
    process.argv=["node","bootstrap-admin","uuid"];mocks.run.mockResolvedValueOnce(0);mocks.close.mockResolvedValueOnce(undefined);await import("../scripts/bootstrap-admin.mts");expect(mocks.run).toHaveBeenCalledWith(["uuid"],expect.anything(),console.log);expect(process.exitCode).toBe(0);expect(mocks.close).toHaveBeenCalledOnce();
    vi.resetModules();mocks.run.mockResolvedValueOnce(1);mocks.close.mockRejectedValueOnce(new Error("private-connection"));await import("../scripts/bootstrap-admin.mts");expect(process.exitCode).toBe(1);expect(error).toHaveBeenCalledWith("Database cleanup failed.");
  } finally {process.exitCode=previous;process.argv=argv;error.mockRestore();}
});
