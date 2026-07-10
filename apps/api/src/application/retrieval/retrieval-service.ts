import type { VectorStore } from "@board-game-rules-assistant/rag-core";
import type {
  RuleAnswerAgent,
  RuleContextAgent,
} from "@board-game-rules-assistant/agent-core";
import type { RequestClassifierService } from "./request-classifier-service";
import type {
  RetrievalMatch,
  RetrievalSearchInput,
  RetrievalSearchResult,
} from "./retrieval-types";

const DEFAULT_TOP_K = 5;

export class RetrievalService {
  constructor(
    private readonly vectorStore: VectorStore,
    private readonly requestClassifier: RequestClassifierService,
    private readonly createRuleContextAgent: (
      context: string,
    ) => RuleContextAgent,
    private readonly createRuleAnswerAgent: (
      context: string,
    ) => RuleAnswerAgent,
  ) {}

  async search({
    query,
  }: RetrievalSearchInput): Promise<RetrievalSearchResult> {
    const classification = this.requestClassifier.classify(query);

    if (!classification.isGameRuleQuestion) {
      return {
        answer:
          "I can only answer board-game rules questions from indexed rulebook context. Ask about a specific game rule, turn, card, resource, scoring, setup, or movement question.",
        matches: [],
      };
    }

    const documents = await this.vectorStore.similaritySearch({
      query: classification.normalizedQuery,
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
    const contextAgent = this.createRuleContextAgent(retrievedContext);
    const relevantRules = await contextAgent.run(query);
    const answerAgent = this.createRuleAnswerAgent(relevantRules);
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
