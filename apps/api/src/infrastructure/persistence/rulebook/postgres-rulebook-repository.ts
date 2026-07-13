import type { Pool } from "pg";

import type {
  RulebookRecord,
  RulebookRepository,
  SaveRulebookRecord,
} from "../../../domain/rulebook/rulebook-repository";
import { InMemoryRulebookRepository } from "./in-memory-rulebook-repository";

type RulebookRow = {
  id: string;
  game_name: string;
  pdf_name: string;
  file_size: number;
};

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

  async list(): Promise<RulebookRecord[]> {
    const result = await this.pool.query<RulebookRow>(
      `SELECT id, game_name, pdf_name, file_size
       FROM rulebooks
       ORDER BY created_at DESC, id DESC`,
    );

    return result.rows.map((row) => ({
      id: row.id,
      gameName: row.game_name,
      pdfName: row.pdf_name,
      fileSize: row.file_size,
    }));
  }
}
