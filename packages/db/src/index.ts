/** Persistence contracts. PostgreSQL/MikroORM implementation follows in phase 2. */
import type { EntityId } from "@devmentor/core";

export interface Repository<T extends { id: EntityId }> {
  findById(id: EntityId): Promise<T | null>;
}
