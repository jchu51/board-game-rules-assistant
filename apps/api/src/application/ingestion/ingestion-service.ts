import {
  chunkDocuments,
  loadPdfDocuments,
  type VectorStore,
} from "@board-game-rules-assistant/rag-core";
import { InvalidSplitterParamsError } from "../../domain/ingestion/ingestion-errors";
import type {
  IngestPdfInput,
  IngestionResult,
  IngestionServiceOptions,
} from "./ingestion-types";

export class IngestionService {
  constructor(
    private readonly vectorStore: VectorStore,
    private readonly options: IngestionServiceOptions,
  ) {}

  async ingestPdf({
    filePath,
    metadata,
    source,
    splitterParams,
  }: IngestPdfInput): Promise<IngestionResult> {
    const mergedSplitterParams = {
      ...this.options.defaultSplitterParams,
      ...splitterParams,
    };

    if (mergedSplitterParams.chunkOverlap >= mergedSplitterParams.chunkSize) {
      throw new InvalidSplitterParamsError(
        mergedSplitterParams.chunkSize,
        mergedSplitterParams.chunkOverlap,
      );
    }

    const documents = await loadPdfDocuments(filePath, { source });

    if (metadata) {
      for (const document of documents) {
        document.metadata = {
          ...document.metadata,
          ...metadata,
        };
      }
    }

    const chunks = await chunkDocuments(documents, mergedSplitterParams);

    await this.vectorStore.upsert(chunks);

    return {
      documentCount: documents.length,
      chunkCount: chunks.length,
    };
  }
}
