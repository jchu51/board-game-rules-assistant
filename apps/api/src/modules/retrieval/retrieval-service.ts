import type { VectorStore } from "@board-game-rules-assistant/rag-core";
import type {
  RuleAnswerAgent,
  RuleContextAgent,
} from "@board-game-rules-assistant/agent-core";
import type {
  RetrievalMatch,
  RetrievalSearchResponseBody,
  RetrievalSearchRequestBody,
} from "./retrieval-types";

const DEFAULT_TOP_K = 5;

type RetrievalServiceOptions = {
  createRuleAnswerAgent: (context: string) => RuleAnswerAgent;
  createRuleContextAgent: (context: string) => RuleContextAgent;
};

export class RetrievalService {
  constructor(
    private readonly vectorStore: VectorStore,
    private readonly options: RetrievalServiceOptions,
  ) {}

  async search({
    query,
  }: RetrievalSearchRequestBody): Promise<RetrievalSearchResponseBody> {
    const documents = await this.vectorStore.similaritySearch({
      query,
      topK: DEFAULT_TOP_K,
    });

    const matches = documents.map((document) => ({
      content: document.pageContent,
      metadata: {
        documentId: document.metadata.documentId,
        pageNumber: document.metadata.loc?.pageNumber,
        source: document.metadata.source,
      },
    }));

    if (matches.length === 0) {
      return {
        answer:
          "I could not find relevant rulebook context for that question in the indexed documents.",
        matches,
      };
    }

    const retrievedContext = this.formatRetrievedContext(matches);
    const contextAgent = this.options.createRuleContextAgent(retrievedContext);
    const relevantRules = await contextAgent.run(query);
    const answerAgent = this.options.createRuleAnswerAgent(relevantRules);
    const answer = await answerAgent.run(query);

    return { answer, matches };
  }

  private formatRetrievedContext(matches: RetrievalMatch[]): string {
    return matches
      .map((match, index) => {
        const metadata = [
          match.metadata.source ? `source=${match.metadata.source}` : "",
          match.metadata.pageNumber ? `page=${match.metadata.pageNumber}` : "",
          match.metadata.documentId
            ? `documentId=${match.metadata.documentId}`
            : "",
        ]
          .filter(Boolean)
          .join(", ");

        return [
          `Chunk ${index + 1}${metadata ? ` (${metadata})` : ""}:`,
          match.content,
        ].join("\n");
      })
      .join("\n\n---\n\n");
  }
}
