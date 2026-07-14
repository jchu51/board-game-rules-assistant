import { InvalidSplitterParamsError } from "../../domain/ingestion/ingestion-errors";
import type { VectorStore } from "../../domain/rulebook/vector-store";
import type {
  DocumentChunker,
  IngestPdfInput,
  IngestionResult,
  IngestionServiceOptions,
  PdfLoader,
} from "./ingestion-types";

export class IngestionService {
  constructor(
    private readonly vectorStore: VectorStore,
    private readonly loadPdfDocuments: PdfLoader,
    private readonly chunkDocuments: DocumentChunker,
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

    const documents = await this.loadPdfDocuments(filePath, { source });

    if (metadata) {
      for (const document of documents) {
        document.metadata = {
          ...document.metadata,
          ...metadata,
        };
      }
    }

    const chunks = await this.chunkDocuments(documents, mergedSplitterParams);

    await this.vectorStore.upsert(chunks);

    return {
      documentCount: documents.length,
      chunkCount: chunks.length,
    };
  }
}
