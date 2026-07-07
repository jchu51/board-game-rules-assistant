import { stat } from "node:fs/promises";
import {
  chunkDocuments,
  loadPdfDocuments,
  type VectorStore,
} from "@board-game-rules-assistant/rag-core";
import { resolveContainedPath } from "../../shared/files/resolve-contained-path";
import {
  IngestionFileTooLargeError,
  InvalidIngestionFilePathError,
} from "./ingestion-errors";
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
    splitterParams,
  }: IngestPdfInput): Promise<IngestionResult> {
    const resolvedFilePath = resolveContainedPath({
      allowedExtensions: [".pdf"],
      baseDirectory: this.options.uploadDirectory,
      requestedPath: filePath,
    });

    if (!resolvedFilePath) {
      throw new InvalidIngestionFilePathError();
    }

    const { size } = await stat(resolvedFilePath);

    if (size > this.options.maxUploadSizeBytes) {
      throw new IngestionFileTooLargeError(
        size,
        this.options.maxUploadSizeBytes,
      );
    }

    const documents = await loadPdfDocuments(resolvedFilePath);
    const mergedSplitterParams = {
      ...this.options.defaultSplitterParams,
      ...splitterParams,
    };

    const chunks = await chunkDocuments(documents, mergedSplitterParams);

    await this.vectorStore.upsert(chunks);

    return {
      documentCount: documents.length,
      chunkCount: chunks.length,
    };
  }
}
