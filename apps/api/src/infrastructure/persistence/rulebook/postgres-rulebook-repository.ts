import type { Pool } from "pg";

import type {
  RulebookRecord,
  RulebookRepository,
  SaveRulebookRecord,
} from "../../../domain/rulebook/rulebook-repository";
import { InMemoryRulebookRepository } from "./in-memory-rulebook-repository";

export class PostgresRulebookRepository implements RulebookRepository {
  private readonly currentProcessRepository = new InMemoryRulebookRepository();

  constructor(private readonly pool: Pool) {}

  async save(record: SaveRulebookRecord): Promise<RulebookRecord> {
    await this.pool.query(
      `INSERT INTO rulebooks
         (id, game_name, pdf_name, mime_type, file_size, pdf_data)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        record.id,
        record.gameName,
        record.pdfName,
        record.mimeType,
        record.fileSize,
        Buffer.from(record.pdfData),
      ],
    );

    return this.currentProcessRepository.save(record);
  }

  deleteById(id: string): boolean {
    return this.currentProcessRepository.deleteById(id);
  }

  list(): RulebookRecord[] {
    return this.currentProcessRepository.list();
  }
}
