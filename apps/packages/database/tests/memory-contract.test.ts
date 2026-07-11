import assert from "node:assert/strict";
import { test } from "node:test";

import { Document } from "@langchain/core/documents";
import type { RulebookDocument } from "@board-game-rules-assistant/rag-core";

import { createMemoryPersistence } from "../src/index.js";
import { runPersistenceContract } from "./contract-suite.js";

runPersistenceContract("memory persistence", async () =>
  createMemoryPersistence(),
);

const createChunk = (
  pageContent: string,
  documentId: string,
): RulebookDocument =>
  new Document({
    pageContent,
    metadata: { documentId },
  }) as RulebookDocument;

test("vector upsert retains every chunk in a document batch", async () => {
  const persistence = await createMemoryPersistence();

  await persistence.vectorStore.upsert([
    createChunk("Setup chunk", "catan-rules"),
    createChunk("Trading chunk", "catan-rules"),
  ]);

  const results = await persistence.vectorStore.similaritySearch({
    query: "rules",
    topK: 10,
  });
  assert.deepEqual(
    results.map((result) => result.pageContent),
    ["Setup chunk", "Trading chunk"],
  );
  await persistence.close();
});

test("vector upsert replaces the complete previous chunk set", async () => {
  const persistence = await createMemoryPersistence();

  await persistence.vectorStore.upsert([
    createChunk("Old setup", "catan-rules"),
    createChunk("Old trading", "catan-rules"),
  ]);
  await persistence.vectorStore.upsert([
    createChunk("New setup", "catan-rules"),
    createChunk("New trading", "catan-rules"),
  ]);

  const results = await persistence.vectorStore.similaritySearch({
    query: "rules",
    topK: 10,
  });
  assert.deepEqual(
    results.map((result) => result.pageContent),
    ["New setup", "New trading"],
  );
  await persistence.close();
});

test("vector upsert clones input documents", async () => {
  const persistence = await createMemoryPersistence();
  const input = createChunk("Stored rules", "catan-rules");

  await persistence.vectorStore.upsert([input]);
  input.pageContent = "Mutated rules";

  const results = await persistence.vectorStore.similaritySearch({
    query: "rules",
    topK: 10,
  });
  assert.equal(results.length, 1);
  assert.equal(results[0]?.pageContent, "Stored rules");
  await persistence.close();
});
