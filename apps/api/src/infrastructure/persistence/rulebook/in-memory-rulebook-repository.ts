import type {
  RulebookRecord,
  RulebookRepository,
  SaveRulebookRecord,
} from "../../../domain/rulebook/rulebook-repository";

export class InMemoryRulebookRepository implements RulebookRepository {
  private readonly rulebooks = new Map<string, SaveRulebookRecord>();

  async save(record: SaveRulebookRecord): Promise<RulebookRecord> {
    this.rulebooks.set(record.id, {
      ...record,
      pdfData: record.pdfData.slice(),
    });

    return this.toRulebookRecord(record);
  }

  deleteById(id: string): boolean {
    return this.rulebooks.delete(id);
  }

  list(): RulebookRecord[] {
    return Array.from(this.rulebooks.values(), (record) =>
      this.toRulebookRecord(record),
    );
  }

  private toRulebookRecord(record: SaveRulebookRecord): RulebookRecord {
    return {
      id: record.id,
      gameName: record.gameName,
      pdfName: record.pdfName,
      fileSize: record.fileSize,
    };
  }
}
