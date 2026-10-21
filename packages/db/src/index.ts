export type EntityId = string;

export { databaseOptions } from "./config";
export { createDatabaseRuntime, database } from "./runtime";

export interface Repository<T extends { id: EntityId }> {
  findById(id: EntityId): Promise<T | null>;
}
