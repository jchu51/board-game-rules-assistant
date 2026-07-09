import type {
  RulebookDocument,
  VectorStore,
} from "@board-game-rules-assistant/rag-core";
import type {
  RetrievalMatch,
  RetrievalSearchRequestBody,
} from "./retrieval-types";

export class RetrievalService {
  constructor(private readonly vectorStore: VectorStore) {}

  async search({
    query,
    rulebookId,
    topK,
  }: RetrievalSearchRequestBody): Promise<RetrievalMatch[]> {
    const documents = await this.vectorStore.similaritySearch({
      query,
      topK,
      filter: rulebookId ? this.createRulebookFilter(rulebookId) : undefined,
    });

    return documents.map((document) => ({
      content: document.pageContent,
      metadata: {
        documentId: document.metadata.documentId,
        pageNumber: document.metadata.loc?.pageNumber,
        source: document.metadata.source,
      },
    }));
  }

  private createRulebookFilter =
    (rulebookId: string) => (document: RulebookDocument) =>
      document.metadata.documentId === rulebookId;
}
