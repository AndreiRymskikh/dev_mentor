import { afterEach, describe, expect, it, vi } from "vitest";
import { MikroORM, type EntityManager } from "@mikro-orm/postgresql";
import { database, databaseOptions, createDatabaseRuntime, type Repository } from "../packages/db/src";

const url = "postgresql://test:secret@localhost:5432/devmentor_test";
afterEach(() => { vi.unstubAllEnvs(); });

function fixture() {
  const transactionalManager = { marker: "transaction" } as unknown as EntityManager;
  const managers: { clear: ReturnType<typeof vi.fn>; transactional: ReturnType<typeof vi.fn> }[] = [];
  const fork = vi.fn(() => {
    const manager = { clear: vi.fn(), transactional: vi.fn(async (work: (em: EntityManager) => Promise<unknown>) => work(transactionalManager)) };
    managers.push(manager);
    return manager;
  });
  const close = vi.fn(async () => {});
  const orm = { em: { fork }, close } as unknown as MikroORM;
  const init = vi.spyOn(MikroORM, "init").mockResolvedValue(orm);
  const options = vi.fn(() => databaseOptions());
  vi.stubEnv("DATABASE_URL", url);
  return { runtime: createDatabaseRuntime(options), options, init, orm, fork, close, managers, transactionalManager };
}

describe("database configuration", () => {
  it("keeps importing the package and constructing runtimes independent of secrets", async () => {
    vi.stubEnv("DATABASE_URL", undefined);
    const init = vi.spyOn(MikroORM, "init");
    expect(database).toBeDefined();
    const runtime = createDatabaseRuntime();
    await runtime.close();
    expect(init).not.toHaveBeenCalled();
    await expect(runtime.getOrm()).rejects.toThrow("DATABASE_URL is required");
  });
  it.each(["secret", "http://user:secret@host/db", "postgresql:///db", "postgresql://host/"])("rejects invalid connection settings without disclosing them: %s", (value) => {
    vi.stubEnv("DATABASE_URL", value);
    expect(() => databaseOptions()).toThrow("DATABASE_URL must be a PostgreSQL connection URL");
  });
  it.each([url, "postgres://localhost/devmentor"])("uses explicit PostgreSQL isolation and bounded pool settings", (value) => {
    vi.stubEnv("DATABASE_URL", value);
    expect(databaseOptions()).toMatchObject({ clientUrl: value, allowGlobalContext: false, debug: false, pool: { min: 0, max: 10 } });
  });
  it("suppresses ORM diagnostics that could contain credentials", () => {
    vi.stubEnv("DATABASE_URL", url);
    const log = vi.spyOn(console, "log");
    const options = databaseOptions();
    options.logger?.("connection failed: password=secret");
    expect(log).not.toHaveBeenCalled();
  });
  it("initializes the real installed ORM without opening a database connection", async () => {
    vi.stubEnv("DATABASE_URL", url);
    const orm = await MikroORM.init(databaseOptions());
    try {
      const first = orm.em.fork();
      const second = orm.em.fork();
      expect(first).not.toBe(second);
      expect(await orm.isConnected()).toBe(false);
      const repository: Repository<{ id: string }> = { findById: async () => null };
      expect(await repository.findById("missing")).toBeNull();
    } finally { await orm.close(); }
  });
});

describe("lazy database lifetime", () => {
  it("shares one concurrent initialization and never closes the pool per request", async () => {
    const f = fixture();
    expect(f.init).not.toHaveBeenCalled();
    expect(await Promise.all([f.runtime.getOrm(), f.runtime.getOrm()])).toEqual([f.orm, f.orm]);
    expect(f.init).toHaveBeenCalledOnce();
    const seen: EntityManager[] = [];
    await Promise.all([1, 2].map(() => f.runtime.withEntityManager(async (manager) => { seen.push(manager); return "done"; })));
    expect(seen[0]).not.toBe(seen[1]);
    expect(f.fork).toHaveBeenCalledWith({ clear: true, useContext: false });
    expect(f.managers.every((manager) => manager.clear.mock.calls.length === 1)).toBe(true);
    expect(f.close).not.toHaveBeenCalled();
  });
  it("retries after failed initialization", async () => {
    const f = fixture();
    f.init.mockRejectedValueOnce(new Error("offline"));
    await expect(f.runtime.getOrm()).rejects.toThrow("offline");
    expect(await f.runtime.getOrm()).toBe(f.orm);
    expect(f.init).toHaveBeenCalledTimes(2);
  });
  it("clears request identity state after failures and returns successful values", async () => {
    const f = fixture();
    await expect(f.runtime.withEntityManager(async () => { throw new Error("request failed"); })).rejects.toThrow("request failed");
    expect(f.managers[0].clear).toHaveBeenCalledOnce();
    expect(await f.runtime.withEntityManager(async () => 42)).toBe(42);
  });
  it("passes the transaction manager to work and propagates transaction failure", async () => {
    const f = fixture();
    const work = vi.fn(async (manager: EntityManager) => manager);
    expect(await f.runtime.transaction(work)).toBe(f.transactionalManager);
    expect(work).toHaveBeenCalledWith(f.transactionalManager);
    expect(f.managers[0].transactional).toHaveBeenCalledWith(work, { clear: true });
    await expect(f.runtime.transaction(async () => { throw new Error("rollback"); })).rejects.toThrow("rollback");
    expect(f.managers[1].clear).toHaveBeenCalledOnce();
  });
  it("deduplicates shutdown during initialization, then permits a fresh pool", async () => {
    const f = fixture();
    let resolve!: (orm: MikroORM) => void;
    f.init.mockReturnValueOnce(new Promise<MikroORM>((done) => { resolve = done; }));
    const pending = f.runtime.getOrm();
    const closes = [f.runtime.close(), f.runtime.close()];
    const next = f.runtime.getOrm();
    resolve(f.orm);
    await pending;
    await Promise.all(closes);
    expect(await next).toBe(f.orm);
    expect(f.close).toHaveBeenCalledOnce();
    expect(f.init).toHaveBeenCalledTimes(2);
    await f.runtime.close();
    await f.runtime.close();
    expect(f.close).toHaveBeenCalledTimes(2);
  });
  it("propagates initialization failure during shutdown and permits retry", async () => {
    const f = fixture();
    f.init.mockRejectedValueOnce(new Error("unavailable"));
    const pending = f.runtime.getOrm();
    const close = f.runtime.close();
    await expect(pending).rejects.toThrow("unavailable");
    await expect(close).rejects.toThrow("unavailable");
    expect(await f.runtime.getOrm()).toBe(f.orm);
  });
  it("retains the pool after failed close so shutdown can be retried", async () => {
    const f = fixture();
    await f.runtime.getOrm();
    f.close.mockRejectedValueOnce(new Error("close failed"));
    await expect(f.runtime.close()).rejects.toThrow("close failed");
    expect(await f.runtime.getOrm()).toBe(f.orm);
    await f.runtime.close();
    expect(f.close).toHaveBeenCalledTimes(2);
  });
});
