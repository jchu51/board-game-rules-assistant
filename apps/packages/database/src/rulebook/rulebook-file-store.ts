import type { Pool } from "pg";

export type RulebookFileRecord = {
  id: string;
  gameName: string;
  pdfName: string;
  mimeType: string;
  fileSize: number;
  pdfData: Uint8Array;
};

export interface RulebookFileStore {
  save(record: RulebookFileRecord): Promise<void>;
}

export class PostgresRulebookFileStore implements RulebookFileStore {
  constructor(private readonly pool: Pool) {}

  async save(record: RulebookFileRecord): Promise<void> {
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
  }
}
