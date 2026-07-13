import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";

import { createPostgresPersistence } from "../src/persistence.js";
import { createTestDatabase, KeywordEmbeddings } from "./test-database.js";

describe("PostgresRulebookFileStore", () => {
  it("persists rulebook metadata and PDF bytes", async () => {
    const database = await createTestDatabase();
    const persistence = await createPostgresPersistence({
      databaseUrl: database.pool.options.connectionString!,
      embeddings: new KeywordEmbeddings(),
      vectorTableName: `rulebook_vectors_${Date.now()}`,
    });
    const id = randomUUID();

    try {
      const pdfData = Uint8Array.from([0x25, 0x50, 0x44, 0x46, 0x2d]);

      await persistence.rulebookFileStore.save({
        id,
        gameName: "Catan",
        pdfName: "catan.pdf",
        mimeType: "application/pdf",
        fileSize: pdfData.byteLength,
        pdfData,
      });

      expect(
        (
          await persistence.pool.query(
            `SELECT id, game_name, pdf_name, mime_type, file_size, pdf_data
             FROM rulebooks
             WHERE id = $1`,
            [id],
          )
        ).rows,
      ).toEqual([
        {
          id,
          game_name: "Catan",
          pdf_name: "catan.pdf",
          mime_type: "application/pdf",
          file_size: pdfData.byteLength,
          pdf_data: Buffer.from(pdfData),
        },
      ]);
    } finally {
      await persistence.pool.query("DELETE FROM rulebooks WHERE id = $1", [id]);
      await persistence.close();
      await database.dispose();
    }
  });
});
