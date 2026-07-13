import type { Pool } from "pg";
import { describe, expect, it, vi } from "vitest";

import { PostgresRulebookRepository } from "../src/infrastructure/persistence/rulebook/postgres-rulebook-repository";

describe("PostgresRulebookRepository", () => {
  it("persists PDF bytes and keeps current-process delete behavior", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const repository = new PostgresRulebookRepository({
      query,
    } as unknown as Pool);
    const pdfData = Uint8Array.from([0x25, 0x50, 0x44, 0x46]);

    await repository.save({
      id: "11111111-1111-4111-8111-111111111111",
      gameName: "Catan",
      pdfName: "catan.pdf",
      mimeType: "application/pdf",
      fileSize: pdfData.byteLength,
      pdfData,
    });

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO rulebooks"),
      [
        "11111111-1111-4111-8111-111111111111",
        "Catan",
        "catan.pdf",
        "application/pdf",
        pdfData.byteLength,
        Buffer.from(pdfData),
      ],
    );
    expect(repository.deleteById("11111111-1111-4111-8111-111111111111")).toBe(
      true,
    );
  });

  it("lists persisted metadata newest first without selecting PDF bytes", async () => {
    const query = vi.fn().mockResolvedValue({
      rows: [
        {
          id: "22222222-2222-4222-8222-222222222222",
          game_name: "Pandemic",
          pdf_name: "pandemic.pdf",
          file_size: 2048,
        },
        {
          id: "11111111-1111-4111-8111-111111111111",
          game_name: "Catan",
          pdf_name: "catan.pdf",
          file_size: 1024,
        },
      ],
    });
    const repository = new PostgresRulebookRepository({
      query,
    } as unknown as Pool);

    await expect(repository.list()).resolves.toEqual([
      {
        id: "22222222-2222-4222-8222-222222222222",
        gameName: "Pandemic",
        pdfName: "pandemic.pdf",
        fileSize: 2048,
      },
      {
        id: "11111111-1111-4111-8111-111111111111",
        gameName: "Catan",
        pdfName: "catan.pdf",
        fileSize: 1024,
      },
    ]);
    expect(query).toHaveBeenCalledWith(
      `SELECT id, game_name, pdf_name, file_size
       FROM rulebooks
       ORDER BY created_at DESC, id DESC`,
    );
    expect(query.mock.calls[0]?.[0]).not.toContain("pdf_data");
  });
});
