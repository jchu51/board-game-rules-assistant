import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Document } from "@langchain/core/documents";

import { chunkDocuments } from "../src/chunking/chunk-documents.js";
import type { RulebookDocument } from "../src/documents/rulebook-document.js";

describe("chunkDocuments", () => {
  it("splits long rulebook documents and preserves metadata", async () => {
    const document = new Document({
      pageContent:
        "Setup each player with two settlements. Then each player places two roads. Victory points are counted at the end.",
      metadata: {
        documentId: "11111111-1111-4111-8111-111111111111",
        loc: { pageNumber: 3 },
        source: "catan.pdf",
      },
    }) as RulebookDocument;

    const chunks = await chunkDocuments([document], {
      chunkOverlap: 0,
      chunkSize: 45,
    });

    assert.ok(chunks.length > 1);
    assert.equal(
      chunks.map((chunk) => chunk.pageContent).join(" "),
      document.pageContent,
    );

    for (const chunk of chunks) {
      assert.equal(
        chunk.metadata.documentId,
        "11111111-1111-4111-8111-111111111111",
      );
      assert.equal(chunk.metadata.loc?.pageNumber, 3);
      assert.equal(chunk.metadata.source, "catan.pdf");
    }
  });
});
