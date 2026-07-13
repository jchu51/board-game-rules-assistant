import type { Pool } from "pg";

import type {
  RulebookRecord,
  RulebookRepository,
  SaveRulebookRecord,
} from "../../../domain/rulebook/rulebook-repository";

type RulebookRow = {
  id: string;
  game_name: string;
  pdf_name: string;
  file_size: number;
};

export class PostgresRulebookRepository implements RulebookRepository {
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

    return {
      id: record.id,
      gameName: record.gameName,
      pdfName: record.pdfName,
      fileSize: record.fileSize,
    };
  }

  async deleteById(id: string): Promise<boolean> {
    const result = await this.pool.query(
      `DELETE FROM rulebooks
       WHERE id = $1`,
      [id],
    );

    return result.rowCount === 1;
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
