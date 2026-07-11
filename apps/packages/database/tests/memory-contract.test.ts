import assert from "node:assert/strict";
import { test } from "node:test";

import { Document } from "@langchain/core/documents";
import type { RulebookDocument } from "@board-game-rules-assistant/rag-core";

import { createMemoryPersistence } from "../src/index.js";
import { runPersistenceContract } from "./contract-suite.js";

runPersistenceContract("memory persistence", async () =>
  createMemoryPersistence(),
);

test("repeated vector upsert replaces the document with the same identity", async () => {
  const persistence = await createMemoryPersistence();
  const original = new Document({
    pageContent: "Original rules",
    metadata: { documentId: "catan-rules" },
  }) as RulebookDocument;
  const replacement = new Document({
    pageContent: "Replacement rules",
    metadata: { documentId: "catan-rules" },
  }) as RulebookDocument;

  await persistence.vectorStore.upsert([original]);
  await persistence.vectorStore.upsert([replacement]);

  const results = await persistence.vectorStore.similaritySearch({
    query: "rules",
    topK: 10,
  });
  assert.equal(results.length, 1);
  assert.equal(results[0]?.pageContent, "Replacement rules");
  await persistence.close();
});
