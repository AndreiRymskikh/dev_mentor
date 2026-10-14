import { randomUUID } from "node:crypto";
import { asFunction, asValue, createContainer, InjectionMode } from "awilix";
import { logger } from "../logger";
import type { Cradle } from "./cradle";

export function createAppContainer() {
  const container = createContainer<Cradle>({ injectionMode: InjectionMode.PROXY, strict: true });
  container.register({ logger: asValue(logger), requestId: asFunction(() => randomUUID()).scoped() });
  return container;
}
const container = createAppContainer();
export async function withScope<T>(run: (cradle: Cradle) => T | Promise<T>): Promise<T> {
  const scope = container.createScope();
  try { return await run(scope.cradle); }
  finally { await scope.dispose(); }
}
