import { test, expect, vi } from "vitest";
const mocks=vi.hoisted(()=>({close:vi.fn(),run:vi.fn()}));
vi.mock("../packages/db/src/index",()=>({database:{close:mocks.close},AuthMaintenanceRepository:class {}}));
vi.mock("../packages/core/src/operators/maintain-auth",()=>({maintainAuth:mocks.run}));
test("operator process forwards arguments, returns runner status and always closes owned pool",async()=>{
  const previous=process.exitCode,argv=process.argv;const error=vi.spyOn(console,"error").mockImplementation(()=>{});
  try {
    process.argv=["node","maintain-auth","uuid"];mocks.run.mockResolvedValueOnce(0);mocks.close.mockResolvedValueOnce(undefined);await import("../scripts/maintain-auth.mts");expect(mocks.run).toHaveBeenCalledWith(["uuid"],expect.anything(),console.log);expect(process.exitCode).toBe(0);expect(mocks.close).toHaveBeenCalledOnce();
    vi.resetModules();mocks.run.mockResolvedValueOnce(1);mocks.close.mockRejectedValueOnce(new Error("private-connection"));await import("../scripts/maintain-auth.mts");expect(process.exitCode).toBe(1);expect(error).toHaveBeenCalledWith("Database cleanup failed.");
  } finally {process.exitCode=previous;process.argv=argv;error.mockRestore();}
});
