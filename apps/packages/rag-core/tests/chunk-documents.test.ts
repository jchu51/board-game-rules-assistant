import { Document } from "@langchain/core/documents";
import { describe, expect, it } from "vitest";

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

    expect(chunks.length).toBeGreaterThan(1);
    expect(
      chunks.map((chunk) => chunk.pageContent).join(" "),
    ).toBe(document.pageContent);

    for (const chunk of chunks) {
      expect(chunk.metadata.documentId).toBe(
        "11111111-1111-4111-8111-111111111111",
      );
      expect(chunk.metadata.loc?.pageNumber).toBe(3);
      expect(chunk.metadata.source).toBe("catan.pdf");
    }
  });
});
