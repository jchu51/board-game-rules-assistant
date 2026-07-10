import assert from "node:assert/strict";
import { describe, it } from "node:test";

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

    assert.equal(repository.create(record), record);
    assert.deepEqual(repository.list(), [record]);
    assert.equal(repository.deleteById("missing"), false);
    assert.equal(repository.deleteById("rulebook-1"), true);
    assert.deepEqual(repository.list(), []);
  });
});
