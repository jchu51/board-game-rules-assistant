import type { Pool } from "pg";
import { describe, expect, it, vi } from "vitest";

import { PostgresRulebookRepository } from "../src/infrastructure/persistence/rulebook/postgres-rulebook-repository";

describe("PostgresRulebookRepository", () => {
  it("persists PDF bytes and keeps current-process list behavior", async () => {
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
    expect(repository.list()).toEqual([
      {
        id: "11111111-1111-4111-8111-111111111111",
        gameName: "Catan",
        pdfName: "catan.pdf",
        fileSize: pdfData.byteLength,
      },
    ]);
    expect(repository.deleteById("11111111-1111-4111-8111-111111111111")).toBe(
      true,
    );
  });
});
