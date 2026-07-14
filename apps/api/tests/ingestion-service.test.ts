import { beforeEach, describe, expect, it, vi } from "vitest";
import { Document } from "@langchain/core/documents";
import type { VectorStore } from "../src/domain/rulebook/vector-store";

import { IngestionService } from "../src/application/ingestion/ingestion-service";
import { InvalidSplitterParamsError } from "../src/domain/ingestion/ingestion-errors";

const chunkDocuments = vi.fn();
const loadPdfDocuments = vi.fn();

const vectorStore = {
  upsert: vi.fn(),
} as unknown as VectorStore;

const createService = (defaultSplitterParams: {
  chunkSize: number;
  chunkOverlap: number;
}) =>
  new IngestionService(vectorStore, loadPdfDocuments, chunkDocuments, {
    defaultSplitterParams,
  });

beforeEach(() => {
  vi.clearAllMocks();
});

describe("IngestionService", () => {
  it("loads, enriches, chunks, and stores PDF documents", async () => {
    const documents = [
      new Document({ pageContent: "Page one", metadata: { page: 1 } }),
      new Document({ pageContent: "Page two", metadata: { page: 2 } }),
    ];
    const chunks = [new Document({ pageContent: "Chunk one", metadata: {} })];
    loadPdfDocuments.mockResolvedValue(documents);
    chunkDocuments.mockResolvedValue(chunks);
    const service = createService({ chunkSize: 500, chunkOverlap: 50 });

    const result = await service.ingestPdf({
      filePath: "/tmp/catan.pdf",
      source: "catan.pdf",
      metadata: { documentId: "document-1" },
      splitterParams: { chunkSize: 250 },
    });

    expect(loadPdfDocuments).toHaveBeenCalledWith("/tmp/catan.pdf", {
      source: "catan.pdf",
    });
    expect(documents[0]?.metadata).toMatchObject({
      page: 1,
      documentId: "document-1",
    });
    expect(chunkDocuments).toHaveBeenCalledWith(documents, {
      chunkSize: 250,
      chunkOverlap: 50,
    });
    expect(vectorStore.upsert).toHaveBeenCalledWith(chunks);
    expect(result).toEqual({ documentCount: 2, chunkCount: 1 });
  });

  it("supports ingestion without metadata", async () => {
    loadPdfDocuments.mockResolvedValue([]);
    chunkDocuments.mockResolvedValue([]);
    const service = createService({ chunkSize: 500, chunkOverlap: 50 });

    await expect(
      service.ingestPdf({ filePath: "/tmp/empty.pdf" }),
    ).resolves.toEqual({
      documentCount: 0,
      chunkCount: 0,
    });
  });

  it("rejects overlap greater than or equal to chunk size", async () => {
    const service = createService({ chunkSize: 100, chunkOverlap: 100 });

    await expect(
      service.ingestPdf({ filePath: "/tmp/catan.pdf" }),
    ).rejects.toBeInstanceOf(InvalidSplitterParamsError);
    expect(loadPdfDocuments).not.toHaveBeenCalled();
  });
});
