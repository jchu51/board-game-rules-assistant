import { CONTEXT_ORIGIN } from "../../domain/retrieval/context-origin";
import type {
  CreateConversationTitleAgent,
  CreateRuleAnswerAgent,
  CreateRuleContextAgent,
} from "./retrieval-agents";
import type {
  PublicSearchResult,
  PublicSearchService,
} from "../public-search/public-search-service";
import type {
  ConversationDetail,
  ConversationMessage,
} from "../../domain/conversation/conversation";
import type { ConversationRepository } from "../../domain/conversation/conversation-repository";
import { ConversationNotFoundError } from "../../domain/conversation/conversation-errors";
import type { VectorStore } from "../../domain/rulebook/vector-store";
import type { RequestClassifierService } from "./request-classifier-service";
import type {
  RetrievalMatch,
  RetrievalAnswerResult,
  RetrievalSearchInput,
  RetrievalSearchResult,
} from "./retrieval-types";

const DEFAULT_TOP_K = 5;
const MIN_RELEVANCE_SCORE = 0.65;
const MAX_CONTEXT_MESSAGES = 10;
// MMR re-ranking: fetch a wide candidate pool, lean towards relevance over
// diversity; the rule-context agent prunes any weaker chunk MMR lets through.
const MMR_FETCH_K = 20;
const MMR_LAMBDA = 0.7;

export class RetrievalService {
  constructor(
    private readonly vectorStore: VectorStore,
    private readonly requestClassifier: RequestClassifierService,
    private readonly publicSearchService: PublicSearchService,
    private readonly conversationRepository: ConversationRepository,
    private readonly createRuleContextAgent: CreateRuleContextAgent,
    private readonly createRuleAnswerAgent: CreateRuleAnswerAgent,
    private readonly createConversationTitleAgent?: CreateConversationTitleAgent,
  ) {}

  async search({
    conversationId,
    query,
  }: RetrievalSearchInput): Promise<RetrievalSearchResult> {
    const storedConversation =
      await this.conversationRepository.getChat(conversationId);
    if (!storedConversation) {
      throw new ConversationNotFoundError(conversationId);
    }

    const conversation: ConversationDetail = storedConversation;
    const conversationMessages =
      conversation.messages.slice(-MAX_CONTEXT_MESSAGES);
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
      return await this.completeTurn(conversation, query, {
        answer:
          "I can only answer board-game rules questions from indexed rulebook context. Ask about a specific game rule, turn, card, resource, scoring, setup, or movement question.",
        matches: [],
      });
    }

    const results = await this.vectorStore.similaritySearchVectorWithScore({
      query: classification.normalizedQuery,
      topK: DEFAULT_TOP_K,
    });
    const relevantResults = results.filter(
      ([, score]) => score > MIN_RELEVANCE_SCORE,
    );

    if (results.length > 0 && relevantResults.length === 0) {
      return await this.completeTurn(conversation, query, {
        answer:
          "I found potentially related rulebook content, but it was not relevant enough to answer confidently. Please clarify the game and the specific rule, action, card, or situation you are asking about.",
        matches: [],
      });
    }

    if (relevantResults.length === 0) {
      const result = await this.searchPublicSources(
        conversationQuestion,
        classification.normalizedQuery,
      );

      return await this.completeTurn(conversation, query, result);
    }

    const diversifiedChunks = await this.vectorStore.maxMarginalRelevanceSearch(
      {
        query: classification.normalizedQuery,
        topK: DEFAULT_TOP_K,
        fetchK: MMR_FETCH_K,
        lambda: MMR_LAMBDA,
      },
    );

    const matches: RetrievalMatch[] = diversifiedChunks.map((chunk) => ({
      origin: CONTEXT_ORIGIN.rulebook,
      content: chunk.pageContent,
      metadata: {
        documentId: chunk.metadata.documentId,
        pageNumber: chunk.metadata.loc?.pageNumber,
        source: chunk.metadata.source,
      },
    }));

    const result = await this.answerFromMatches(conversationQuestion, matches);

    return await this.completeTurn(conversation, query, result);
  }

  private async completeTurn(
    conversation: ConversationDetail,
    query: string,
    result: RetrievalAnswerResult,
  ): Promise<RetrievalSearchResult> {
    const title = await this.resolveTitle(conversation, query);

    if (title !== conversation.title) {
      await this.conversationRepository.updateTitle(
        conversation.conversationId,
        title,
      );
    }

    await this.conversationRepository.appendMessages(
      conversation.conversationId,
      [
        { role: "user", content: query },
        { role: "assistant", content: result.answer },
      ],
    );

    return { title, ...result };
  }

  private async resolveTitle(
    conversation: ConversationDetail,
    query: string,
  ): Promise<string> {
    const isFirstQuestion = conversation.messages.length === 0;

    if (!this.createConversationTitleAgent || !isFirstQuestion) {
      return conversation.title;
    }

    try {
      return await this.createConversationTitleAgent().run(query);
    } catch (error) {
      console.error("conversation title generation failed:\n", error);
      return conversation.title;
    }
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
  ): Promise<RetrievalAnswerResult> {
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
  ): Promise<RetrievalAnswerResult> {
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
