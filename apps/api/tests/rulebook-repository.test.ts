import { describe, expect, it } from "vitest";

import { InMemoryRulebookRepository } from "../src/infrastructure/persistence/rulebook/in-memory-rulebook-repository";

describe("InMemoryRulebookRepository", () => {
  it("creates, lists, and deletes rulebook records", () => {
    const repository = new InMemoryRulebookRepository();
    const record = {
      fileSize: 1024,
      gameName: "Catan",
      id: "rulebook-1",
      pdfName: "catan.pdf",
    };

    expect(repository.create(record)).toBe(record);
    expect(repository.list()).toEqual([record]);
    expect(repository.deleteById("missing")).toBe(false);
    expect(repository.deleteById("rulebook-1")).toBe(true);
    expect(repository.list()).toEqual([]);
  });
});
