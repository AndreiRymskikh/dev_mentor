import { test, expect, vi } from "vitest";
import { AuthMaintenanceRepository, createDatabaseRuntime } from "@devmentor/db";
import { maintainAuth } from "../packages/core/src/operators/maintain-auth";

test("maintenance deletes only bounded expired operational rows in one transaction and propagates rollback failures", async () => {
  const runtime = createDatabaseRuntime();
  const execute = vi.fn().mockResolvedValueOnce(undefined).mockResolvedValueOnce(undefined)
    .mockResolvedValueOnce([{ id: "one" }, { id: "two" }]).mockResolvedValueOnce([]).mockResolvedValueOnce([{ key_digest: "digest" }]);
  const transaction = vi.spyOn(runtime, "transaction").mockImplementation(async work => work({ execute } as never));
  const repository = new AuthMaintenanceRepository(runtime);
  expect(await repository.removeExpired()).toEqual({ sessions: 2, tokens: 0, buckets: 1 });
  expect(transaction).toHaveBeenCalledOnce();
  expect(execute.mock.calls.slice(2).map(call => call[0])).toEqual([
    expect.stringContaining("delete from auth_sessions"), expect.stringContaining("delete from action_tokens"), expect.stringContaining("delete from rate_limit_buckets"),
  ]);
  for (const [sql] of execute.mock.calls.slice(2)) {
    expect(sql).toContain("expires_at <= transaction_timestamp()");
    expect(sql).toContain("limit 500 for update skip locked");
    expect(sql).not.toContain("revoked_at");
    expect(sql).not.toContain("consumed_at");
  }
  expect(execute.mock.calls[0][0]).toBe("set local statement_timeout = '5s'");
  expect(execute.mock.calls[1][0]).toBe("set local lock_timeout = '1s'");
  execute.mockRejectedValueOnce(new Error("database unavailable"));
  await expect(repository.removeExpired()).rejects.toThrow("database unavailable");
  // Default construction remains lazy and does not open a pool.
  expect(new AuthMaintenanceRepository()).toBeInstanceOf(AuthMaintenanceRepository);
});
test("operator rejects arguments before persistence, reports counts, and never prints infrastructure secrets", async () => {
  const removeExpired = vi.fn(), output = vi.fn();
  expect(await maintainAuth(["--all"], { removeExpired }, output)).toBe(1);
  expect(removeExpired).not.toHaveBeenCalled();
  expect(output).toHaveBeenLastCalledWith("Usage: npm run auth:maintain (no arguments)");
  removeExpired.mockResolvedValueOnce({ sessions: 1, tokens: 2, buckets: 3 });
  expect(await maintainAuth([], { removeExpired }, output)).toBe(0);
  expect(output).toHaveBeenLastCalledWith("Expired records removed: sessions=1, tokens=2, buckets=3.");
  removeExpired.mockRejectedValueOnce(new Error("private database credentials"));
  expect(await maintainAuth([], { removeExpired }, output)).toBe(1);
  expect(output).toHaveBeenLastCalledWith("Auth maintenance failed; no successful cleanup is confirmed.");
  expect(JSON.stringify(output.mock.calls)).not.toContain("private database credentials");
});
