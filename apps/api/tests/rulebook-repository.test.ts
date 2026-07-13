import { describe, expect, it } from "vitest";

import { InMemoryRulebookRepository } from "../src/infrastructure/persistence/rulebook/in-memory-rulebook-repository";

describe("InMemoryRulebookRepository", () => {
  it("saves, lists, and deletes rulebook records", async () => {
    const repository = new InMemoryRulebookRepository();
    const record = {
      fileSize: 1024,
      gameName: "Catan",
      id: "rulebook-1",
      mimeType: "application/pdf",
      pdfData: Uint8Array.from([1, 2, 3]),
      pdfName: "catan.pdf",
    };

    await expect(repository.save(record)).resolves.toEqual({
      fileSize: 1024,
      gameName: "Catan",
      id: "rulebook-1",
      pdfName: "catan.pdf",
    });
    await expect(repository.list()).resolves.toEqual([
      {
        fileSize: 1024,
        gameName: "Catan",
        id: "rulebook-1",
        pdfName: "catan.pdf",
      },
    ]);
    await expect(repository.deleteById("missing")).resolves.toBe(false);
    await expect(repository.deleteById("rulebook-1")).resolves.toBe(true);
    await expect(repository.list()).resolves.toEqual([]);
  });
});
