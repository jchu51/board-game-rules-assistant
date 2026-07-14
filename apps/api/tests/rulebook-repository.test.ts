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
    await expect(repository.getById("rulebook-1")).resolves.toEqual({
      fileSize: 1024,
      gameName: "Catan",
      id: "rulebook-1",
      pdfName: "catan.pdf",
    });
    await expect(repository.getById("missing")).resolves.toBeNull();
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

  it("lists newest saves first and moves re-saved records to the front", async () => {
    const repository = new InMemoryRulebookRepository();
    const catan = {
      fileSize: 1024,
      gameName: "Catan",
      id: "catan",
      mimeType: "application/pdf",
      pdfData: Uint8Array.from([1]),
      pdfName: "catan.pdf",
    };
    const pandemic = {
      fileSize: 2048,
      gameName: "Pandemic",
      id: "pandemic",
      mimeType: "application/pdf",
      pdfData: Uint8Array.from([2]),
      pdfName: "pandemic.pdf",
    };

    await repository.save(catan);
    await repository.save(pandemic);
    await expect(repository.list()).resolves.toEqual([
      expect.objectContaining({ id: "pandemic" }),
      expect.objectContaining({ id: "catan" }),
    ]);

    await repository.save(catan);
    await expect(repository.list()).resolves.toEqual([
      expect.objectContaining({ id: "catan" }),
      expect.objectContaining({ id: "pandemic" }),
    ]);
  });
});
