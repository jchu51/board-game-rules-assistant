import type { VectorStore } from "@board-game-rules-assistant/rag-core";
import { CONTEXT_ORIGIN } from "@board-game-rules-assistant/agent-core";
import type {
  RuleAnswerAgent,
  RuleContextAgent,
} from "@board-game-rules-assistant/agent-core";
import type {
  PublicSearchResult,
  PublicSearchService,
} from "../public-search/public-search-service";
import {
  PersistenceNotFoundError,
  type ConversationRepository,
} from "@board-game-rules-assistant/database";
import type { RequestClassifierService } from "./request-classifier-service";
import type {
  RetrievalMatch,
  RetrievalSearchInput,
  RetrievalSearchResult,
} from "./retrieval-types";
import type { AccessPolicyService } from "../access/access-policy-service";

const MIN_RELEVANCE_SCORE = 0.65;
const MAX_CONTEXT_MESSAGES = 10;
const MAX_QUOTED_TEXT_LENGTH = 500;
type ConversationMessage = { role: "user" | "assistant"; content: string };

export class RetrievalInvariantError extends Error {
  readonly code = "RETRIEVAL_INVARIANT_VIOLATION";

  constructor(message: string) {
    super(message);
    this.name = "RetrievalInvariantError";
  }
}

export class RetrievalService {
  constructor(
    private readonly vectorStore: VectorStore,
    private readonly requestClassifier: RequestClassifierService,
    private readonly publicSearchService: PublicSearchService,
    private readonly conversationRepository: ConversationRepository,
    private readonly createRuleContextAgent: (
      context: string,
    ) => RuleContextAgent,
    private readonly createRuleAnswerAgent: (
      context: string,
    ) => RuleAnswerAgent,
    private readonly accessPolicy: AccessPolicyService,
  ) {}

  async search({
    actor,
    conversationId,
    query,
  }: RetrievalSearchInput): Promise<RetrievalSearchResult> {
    const conversation =
      await this.conversationRepository.getOwnedConversation({
        actor,
        conversationId,
      });
    if (!conversation) throw new PersistenceNotFoundError("conversation");
    const allMessages = (await this.conversationRepository.listMessages({ actor, conversationId }))
      .filter((message) => message.role === "user" || message.role === "assistant")
      .map(({ role, content }) => ({ role: role as "user" | "assistant", content }));
    const conversationMessages = allMessages.slice(-MAX_CONTEXT_MESSAGES);
    await this.conversationRepository.appendUserMessage({
      actor,
      conversationId,
      content: query,
    });
    const contextualQuery = this.formatContextualQuery(
      query,
      conversationMessages,
    );
    const conversationQuestion = this.formatConversationQuestion(
      query,
      conversationMessages,
    );
    const classification = this.requestClassifier.classify(contextualQuery);

    if (!classification.isGameRuleQuestion) {
      return this.completeTurn(actor, conversationId, {
        answer:
          "I can only answer board-game rules questions from indexed rulebook context. Ask about a specific game rule, turn, card, resource, scoring, setup, or movement question.",
        matches: [],
      });
    }

    const topK = (await this.accessPolicy.getEffectivePolicy(actor))
      .retrievalTopK;
    const results = await this.vectorStore.similaritySearchVectorWithScore({
      query: classification.normalizedQuery,
      topK,
      scope: {
        gameId: conversation.gameId,
        ...(actor.kind === "user" ? { userId: actor.userId } : {}),
      },
    });
    const relevantResults = results.filter(
      ([, score]) => score > MIN_RELEVANCE_SCORE,
    );
    for (const [document] of relevantResults) {
      if (!document.metadata.documentChunkId) {
        throw new RetrievalInvariantError(
          "Relevant persisted retrieval match is missing documentChunkId",
        );
      }
    }

    const matches: RetrievalMatch[] = relevantResults
      .map(([document]) => ({
        origin: CONTEXT_ORIGIN.rulebook,
        content: document.pageContent,
        metadata: {
          documentId: document.metadata.documentId,
          pageNumber: document.metadata.loc?.pageNumber,
          source: document.metadata.source,
        },
      }));

    if (results.length > 0 && matches.length === 0) {
      return this.completeTurn(actor, conversationId, {
        answer:
          "I found potentially related rulebook content, but it was not relevant enough to answer confidently. Please clarify the game and the specific rule, action, card, or situation you are asking about.",
        matches: [],
      });
    }

    if (matches.length === 0) {
      const result = await this.searchPublicSources(
        conversationQuestion,
        classification.normalizedQuery,
      );

      return this.completeTurn(actor, conversationId, result);
    }

    const result = await this.answerFromMatches(conversationQuestion, matches);

    const citations = relevantResults.map(([document, score], index) => ({
      // Guarded above as a retrieval/persistence boundary invariant.
      documentChunkId: document.metadata.documentChunkId!,
      rank: index + 1,
      distance: Number((1 - score).toFixed(12)),
      quotedText: document.pageContent.slice(0, MAX_QUOTED_TEXT_LENGTH),
    }));
    return this.completeTurn(actor, conversationId, result, citations);
  }

  private async completeTurn(
    actor: RetrievalSearchInput["actor"],
    conversationId: string,
    result: RetrievalSearchResult,
    citations: Array<{
      documentChunkId: string;
      rank: number;
      distance: number;
      quotedText: string;
    }> = [],
  ): Promise<RetrievalSearchResult> {
    await this.conversationRepository.appendAssistantMessageWithCitations({
      actor,
      conversationId,
      content: result.answer,
      model: "rules-assistant",
      citations,
    });

    return result;
  }

  private formatContextualQuery(
    query: string,
    messages: ConversationMessage[],
  ): string {
    if (messages.length === 0) {
      return query;
    }

    const priorUserQuestions = messages
      .filter((message) => message.role === "user")
      .map((message) => `${message.role}: ${message.content}`)
      .join("\n");

    return [
      "Previous user questions:",
      priorUserQuestions,
      "Current user question:",
      query,
    ].join("\n");
  }

  private formatConversationQuestion(
    query: string,
    messages: ConversationMessage[],
  ): string {
    if (messages.length === 0) {
      return query;
    }

    const history = messages
      .map((message) => `${message.role}: ${message.content}`)
      .join("\n");

    return ["Conversation context:", history, "Current question:", query].join(
      "\n",
    );
  }

  private async searchPublicSources(
    query: string,
    normalizedQuery: string,
  ): Promise<RetrievalSearchResult> {
    let publicResults: PublicSearchResult[];

    try {
      publicResults = await this.publicSearchService.search({
        query: normalizedQuery,
      });
    } catch (error) {
      console.error("public search failed:\n", error);
      publicResults = [];
    }

    const matches: RetrievalMatch[] = publicResults.map((result) => ({
      origin: CONTEXT_ORIGIN.publicWeb,
      content: result.content,
      metadata: {
        source: result.url,
      },
    }));

    if (matches.length === 0) {
      return {
        answer:
          "I could not find relevant rulebook context for that question in the indexed documents or a reliable public source.",
        matches,
      };
    }

    return this.answerFromMatches(query, matches);
  }

  private async answerFromMatches(
    query: string,
    matches: RetrievalMatch[],
  ): Promise<RetrievalSearchResult> {
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
          `origin=${match.origin}`,
          match.metadata.source ? `source=${match.metadata.source}` : "",
          match.metadata.pageNumber ? `page=${match.metadata.pageNumber}` : "",
          match.metadata.documentId
            ? `documentId=${match.metadata.documentId}`
            : "",
        ]
          .filter(Boolean)
          .join(", ");

        return [`Chunk ${index + 1} (${metadata}):`, match.content].join("\n");
      })
      .join("\n\n---\n\n");
  }
}
