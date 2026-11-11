import {test,expect,vi} from "vitest";
const mocks=vi.hoisted(()=>({close:vi.fn(),maintain:vi.fn()}));
vi.mock("../packages/db/src/index.ts",()=>({database:{close:mocks.close},BookingRepository:class {maintain=mocks.maintain;}}));
test("retention operator requires explicit database, emits aggregate counts, hides failures and closes pool",async()=>{
 const previous=process.exitCode,log=vi.spyOn(console,"log").mockImplementation(()=>{}),error=vi.spyOn(console,"error").mockImplementation(()=>{});
 try {
  vi.stubEnv("DATABASE_URL",undefined);await import("../scripts/maintain-bookings.mts");expect(process.exitCode).toBe(1);expect(mocks.maintain).not.toHaveBeenCalled();expect(mocks.close).toHaveBeenCalledOnce();
  vi.resetModules();vi.stubEnv("DATABASE_URL","postgresql://test:test@localhost/test");mocks.maintain.mockResolvedValueOnce(2);await import("../scripts/maintain-bookings.mts");expect(log).toHaveBeenLastCalledWith(JSON.stringify({event:"bookings.retention.completed",deleted:2}));
  vi.resetModules();mocks.close.mockRejectedValueOnce(new Error("private cleanup"));mocks.maintain.mockRejectedValueOnce(new Error("private connection"));await import("../scripts/maintain-bookings.mts");expect(error).toHaveBeenCalledWith("Booking retention failed; no request or participant details logged.");expect(error).toHaveBeenLastCalledWith("Booking retention database cleanup failed.");expect(JSON.stringify(error.mock.calls)).not.toContain("private connection");
 }finally{process.exitCode=previous;vi.unstubAllEnvs();}
});
