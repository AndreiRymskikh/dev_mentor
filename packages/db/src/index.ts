export type EntityId = string;

export interface Repository<T extends { id: EntityId }> {
  findById(id: EntityId): Promise<T | null>;
}
