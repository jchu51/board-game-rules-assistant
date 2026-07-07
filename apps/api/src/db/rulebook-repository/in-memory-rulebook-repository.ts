import type {
  RulebookRecord,
  RulebookRepository,
} from "./rulebook-repository";

export class InMemoryRulebookRepository implements RulebookRepository {
  private readonly rulebooks = new Map<string, RulebookRecord>();

  create(record: RulebookRecord): RulebookRecord {
    this.rulebooks.set(record.id, record);
    return record;
  }

  deleteById(id: string): boolean {
    return this.rulebooks.delete(id);
  }

  list(): RulebookRecord[] {
    return Array.from(this.rulebooks.values());
  }
}
