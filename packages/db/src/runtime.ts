import { MikroORM, type EntityManager, type Options } from "@mikro-orm/postgresql";
import { databaseOptions } from "./config";

export function createDatabaseRuntime(options: () => Options = databaseOptions) {
  let initialization: Promise<MikroORM> | undefined;
  let shutdown: Promise<void> | undefined;

  async function getOrm(): Promise<MikroORM> {
    if (shutdown) await shutdown;
    if (!initialization) {
      initialization = MikroORM.init(options()).catch((error: unknown) => {
        initialization = undefined;
        throw error;
      });
    }
    return initialization;
  }

  async function withEntityManager<T>(work: (manager: EntityManager) => Promise<T>): Promise<T> {
    const orm = await getOrm();
    const manager = orm.em.fork({ clear: true, useContext: false });
    try {
      return await work(manager);
    } finally {
      // A request owns its identity map, never the shared connection pool.
      manager.clear();
    }
  }

  async function transaction<T>(work: (manager: EntityManager) => Promise<T>): Promise<T> {
    return withEntityManager((manager) => manager.transactional(work, { clear: true }));
  }

  async function close(): Promise<void> {
    if (!shutdown) {
      shutdown = (async () => {
        if (initialization) {
          const orm = await initialization;
          await orm.close();
          initialization = undefined;
        }
      })().finally(() => { shutdown = undefined; });
    }
    return shutdown;
  }

  return { getOrm, withEntityManager, transaction, close };
}

/** One lazy pool per server process; request scopes use withEntityManager. */
export const database = createDatabaseRuntime();
