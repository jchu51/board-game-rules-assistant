import type {
  RulebookFileRecord,
  RulebookFileStore,
} from "@board-game-rules-assistant/database";

export class InMemoryRulebookFileStore implements RulebookFileStore {
  private readonly records = new Map<string, RulebookFileRecord>();

  async save(record: RulebookFileRecord): Promise<void> {
    this.records.set(record.id, {
      ...record,
      pdfData: record.pdfData.slice(),
    });
  }

  get(id: string): RulebookFileRecord | undefined {
    const record = this.records.get(id);

    return record ? { ...record, pdfData: record.pdfData.slice() } : undefined;
  }
}
