import { describe, expect, it, vi } from "vitest";
import { Document } from "@langchain/core/documents";
import type { EmbeddingsInterface } from "@langchain/core/embeddings";
import type {
  ConversationMetadata,
  ConversationMetadataAgent,
  RuleAnswerAgent,
  RuleContextAgent,
} from "@board-game-rules-assistant/agent-core";
import {
  LangchainMemoryVectorStore,
  type RulebookDocument,
  type RulebookDocumentInterface,
  type VectorStore,
  type VectorStoreSimilaritySearchInput,
} from "@board-game-rules-assistant/rag-core";

import type {
  PublicSearchInput,
  PublicSearchResult,
  PublicSearchService,
} from "../src/application/public-search/public-search-service";
import { RequestClassifierService } from "../src/application/retrieval/request-classifier-service";
import { RetrievalService } from "../src/application/retrieval/retrieval-service";
import { InMemoryConversationRepository } from "../src/infrastructure/persistence/conversation/in-memory-conversation-repository";

const CONVERSATION_ID = "11111111-1111-4111-8111-111111111111";

class KeywordEmbeddings implements EmbeddingsInterface {
  private readonly terms = ["city", "resources", "road", "infection"];

  async embedDocuments(documents: string[]): Promise<number[][]> {
    return documents.map((document) => this.embedText(document));
  }

  async embedQuery(document: string): Promise<number[]> {
    return this.embedText(document);
  }

  private embedText(text: string): number[] {
    const normalizedText = text.toLowerCase();
    const vector = this.terms.map((term) =>
      normalizedText.includes(term) ? 1 : 0,
    );

    return vector.some((value) => value > 0)
      ? vector
      : [0.001, 0.001, 0.001, 0.001];
  }
}

class RecordingVectorStore implements VectorStore {
  readonly searches: VectorStoreSimilaritySearchInput[] = [];

  async upsert(): Promise<void> {}

  async similaritySearch(
    input: VectorStoreSimilaritySearchInput,
  ): Promise<RulebookDocumentInterface[]> {
    this.searches.push(input);
    return [];
  }

  async similaritySearchVectorWithScore(
    input: VectorStoreSimilaritySearchInput,
  ): Promise<[RulebookDocumentInterface, number][]> {
    this.searches.push(input);
    return [];
  }
}

class StubPublicSearchService implements PublicSearchService {
  readonly searches: PublicSearchInput[] = [];

  constructor(private readonly results: PublicSearchResult[] = []) {}

  async search(input: PublicSearchInput): Promise<PublicSearchResult[]> {
    this.searches.push(input);
    return this.results;
  }
}

const createRulebookDocument = (
  pageContent: string,
  metadata: RulebookDocument["metadata"],
): RulebookDocumentInterface =>
  new Document({
    pageContent,
    metadata,
  }) as RulebookDocumentInterface;

const createVectorStore = async (
  documents: RulebookDocumentInterface[] = [],
) => {
  const vectorStore = new LangchainMemoryVectorStore(new KeywordEmbeddings());

  if (documents.length > 0) {
    await vectorStore.upsert(documents as RulebookDocument[]);
  }

  return vectorStore;
};

describe("RetrievalService", () => {
  it("returns a not-found answer when vector and public search have no matches", async () => {
    let createdAgent = false;
    const vectorStore = await createVectorStore();
    const publicSearchService = new StubPublicSearchService();
    const service = new RetrievalService(
      vectorStore,
      new RequestClassifierService(),
      publicSearchService,
      new InMemoryConversationRepository(),
      () => {
        createdAgent = true;
        throw new Error("should not create context agent");
      },
      () => {
        createdAgent = true;
        throw new Error("should not create answer agent");
      },
    );

    const result = await service.search({
      conversationId: CONVERSATION_ID,
      query: "How many resources does a city produce?",
    });

    expect(createdAgent).toBe(false);
    expect(publicSearchService.searches.length).toBe(1);
    expect(result.matches).toEqual([]);
    expect(result.answer).toMatch(/could not find relevant rulebook context/i);
  });

  it("asks for clarification when all vector matches are weak", async () => {
    let createdAgent = false;
    // Shares only "city" with the query → cosine 0.5, below the 0.65 cutoff.
    const vectorStore = await createVectorStore([
      createRulebookDocument("A city is built next to a road.", {
        documentId: "22222222-2222-4222-8222-222222222222",
        loc: { pageNumber: 8 },
        source: "catan.pdf",
      }),
    ]);
    const publicSearchService = new StubPublicSearchService();
    const service = new RetrievalService(
      vectorStore,
      new RequestClassifierService(),
      publicSearchService,
      new InMemoryConversationRepository(),
      () => {
        createdAgent = true;
        throw new Error("should not create context agent");
      },
      () => {
        createdAgent = true;
        throw new Error("should not create answer agent");
      },
    );

    const result = await service.search({
      conversationId: CONVERSATION_ID,
      query: "How many resources does a city produce?",
    });

    expect(createdAgent).toBe(false);
    expect(publicSearchService.searches.length).toBe(0);
    expect(result.matches).toEqual([]);
    expect(result.answer).toMatch(/please clarify the game/i);
    expect(result.answer).toMatch(/not relevant enough to answer confidently/i);
  });

  it("degrades to a not-found answer when public search fails", async () => {
    let createdAgent = false;
    const publicSearchError = new Error("tavily is down");
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const vectorStore = await createVectorStore();
    const failingPublicSearchService: PublicSearchService = {
      search: async () => {
        throw publicSearchError;
      },
    };
    const service = new RetrievalService(
      vectorStore,
      new RequestClassifierService(),
      failingPublicSearchService,
      new InMemoryConversationRepository(),
      () => {
        createdAgent = true;
        throw new Error("should not create context agent");
      },
      () => {
        createdAgent = true;
        throw new Error("should not create answer agent");
      },
    );

    const result = await service.search({
      conversationId: CONVERSATION_ID,
      query: "How many resources does a city produce?",
    });

    expect(createdAgent).toBe(false);
    expect(consoleError).toHaveBeenCalledWith(
      "public search failed:\n",
      publicSearchError,
    );
    expect(result.matches).toEqual([]);
    expect(result.answer).toMatch(/could not find relevant rulebook context/i);
  });

  it("answers from public search results when no rulebook context is found", async () => {
    let contextAgentInput = "";
    const vectorStore = await createVectorStore();
    const publicSearchService = new StubPublicSearchService([
      {
        title: "Catan official FAQ",
        url: "https://www.catan.com/faq",
        content: "A city produces two resources.",
        score: 0.9,
      },
    ]);
    const service = new RetrievalService(
      vectorStore,
      new RequestClassifierService(),
      publicSearchService,
      new InMemoryConversationRepository(),
      (context) => {
        contextAgentInput = context;
        return {
          async run() {
            return "Relevant rule: A city produces two resources.";
          },
        } as unknown as RuleContextAgent;
      },
      () => {
        return {
          async run() {
            return "A city produces two resources.";
          },
        } as unknown as RuleAnswerAgent;
      },
    );

    const result = await service.search({
      conversationId: CONVERSATION_ID,
      query: "How many resources does a city produce?",
    });

    expect(publicSearchService.searches.length).toBe(1);
    expect(contextAgentInput).toMatch(/origin=public_web/);
    expect(contextAgentInput).toMatch(/source=https:\/\/www\.catan\.com\/faq/);
    expect(result).toEqual({
      title: "New chat",
      answer: "A city produces two resources.",
      matches: [
        {
          origin: "public_web",
          content: "A city produces two resources.",
          metadata: { source: "https://www.catan.com/faq" },
        },
      ],
    });
  });

  it("skips RAG for out-of-scope requests", async () => {
    const vectorStore = new RecordingVectorStore();
    const publicSearchService = new StubPublicSearchService();
    const service = new RetrievalService(
      vectorStore,
      new RequestClassifierService(),
      publicSearchService,
      new InMemoryConversationRepository(),
      () => {
        throw new Error("should not create context agent");
      },
      () => {
        throw new Error("should not create answer agent");
      },
    );

    const result = await service.search({
      conversationId: CONVERSATION_ID,
      query: "What is the weather tomorrow?",
    });

    expect(vectorStore.searches.length).toBe(0);
    expect(publicSearchService.searches.length).toBe(0);
    expect(result.matches).toEqual([]);
    expect(result.answer).toMatch(/only answer board-game rules questions/i);
  });

  it("uses context and answer agents after formatting retrieved matches", async () => {
    let contextAgentInput = "";
    let answerAgentContext = "";
    let answerAgentQuestion = "";
    const vectorStore = await createVectorStore([
      createRulebookDocument("Cities produce two resources.", {
        documentId: "11111111-1111-4111-8111-111111111111",
        loc: { pageNumber: 3 },
        source: "catan.pdf",
      }),
    ]);
    const service = new RetrievalService(
      vectorStore,
      new RequestClassifierService(),
      new StubPublicSearchService(),
      new InMemoryConversationRepository(),
      (context) => {
        contextAgentInput = context;
        return {
          async run() {
            return "Relevant rule: Cities produce two resources.";
          },
        } as unknown as RuleContextAgent;
      },
      (context) => {
        answerAgentContext = context;
        return {
          async run(question: string) {
            answerAgentQuestion = question;
            return "A city produces two resources.";
          },
        } as unknown as RuleAnswerAgent;
      },
    );

    const result = await service.search({
      conversationId: CONVERSATION_ID,
      query: "How many resources does a city produce?",
    });

    expect(contextAgentInput).toMatch(/Chunk 1/);
    expect(contextAgentInput).toMatch(/origin=rulebook/);
    expect(contextAgentInput).toMatch(/source=catan\.pdf/);
    expect(contextAgentInput).toMatch(/page=3/);
    expect(contextAgentInput).toMatch(/Cities produce two resources/);
    expect(answerAgentContext).toBe(
      "Relevant rule: Cities produce two resources.",
    );
    expect(answerAgentQuestion).toBe("How many resources does a city produce?");
    expect(result).toEqual({
      title: "New chat",
      answer: "A city produces two resources.",
      matches: [
        {
          origin: "rulebook",
          content: "Cities produce two resources.",
          metadata: {
            documentId: "11111111-1111-4111-8111-111111111111",
            pageNumber: 3,
            source: "catan.pdf",
          },
        },
      ],
    });
  });

  it("uses saved thread context for follow-ups and isolates other conversations", async () => {
    const vectorStore = new RecordingVectorStore();
    const conversationRepository = new InMemoryConversationRepository();
    const publicSearchService = new StubPublicSearchService([
      {
        title: "Everdell setup",
        url: "https://example.com/everdell-setup",
        content: "The second player starts with six cards.",
        score: 0.9,
      },
    ]);
    const agentQuestions: string[] = [];
    const service = new RetrievalService(
      vectorStore,
      new RequestClassifierService(),
      publicSearchService,
      conversationRepository,
      () =>
        ({
          async run(question: string) {
            agentQuestions.push(question);
            return "The second player starts with six cards.";
          },
        }) as unknown as RuleContextAgent,
      () =>
        ({
          async run(question: string) {
            agentQuestions.push(question);
            return "The second player starts with six cards.";
          },
        }) as unknown as RuleAnswerAgent,
    );

    await service.search({
      conversationId: CONVERSATION_ID,
      query: "In Everdell, how many cards does the first player start with?",
    });
    const followUpResult = await service.search({
      conversationId: CONVERSATION_ID,
      query: "And the second one?",
    });
    const isolatedResult = await service.search({
      conversationId: "22222222-2222-4222-8222-222222222222",
      query: "And the second one?",
    });

    expect(vectorStore.searches.length).toBe(2);
    expect(vectorStore.searches[1]?.query ?? "").toMatch(
      /In Everdell, how many cards does the first player start with\?/,
    );
    expect(vectorStore.searches[1]?.query ?? "").toMatch(
      /And the second one\?/,
    );
    expect(agentQuestions.at(-1) ?? "").toMatch(/Conversation context:/);
    expect(agentQuestions.at(-1) ?? "").toMatch(/assistant:/);
    expect(followUpResult.answer).toBe(
      "The second player starts with six cards.",
    );
    expect(isolatedResult.answer).toMatch(
      /only answer board-game rules questions/i,
    );
    expect(await conversationRepository.getMessages(CONVERSATION_ID)).toEqual([
      {
        role: "user",
        content:
          "In Everdell, how many cards does the first player start with?",
      },
      {
        role: "assistant",
        content: "The second player starts with six cards.",
      },
      { role: "user", content: "And the second one?" },
      {
        role: "assistant",
        content: "The second player starts with six cards.",
      },
    ]);
  });

  it("generates title and game for the first question", async () => {
    const conversationRepository = new InMemoryConversationRepository();
    const conversationId = await conversationRepository.createConversation();
    const metadata: ConversationMetadata = {
      title: "Catan city production",
      game: "Catan",
    };
    const metadataAgent = {
      run: vi.fn().mockResolvedValue(metadata),
    } as unknown as ConversationMetadataAgent;
    const service = new RetrievalService(
      new RecordingVectorStore(),
      new RequestClassifierService(),
      new StubPublicSearchService(),
      conversationRepository,
      () => {
        throw new Error("should not create context agent");
      },
      () => {
        throw new Error("should not create answer agent");
      },
      () => metadataAgent,
    );

    const result = await service.search({
      conversationId,
      query: "What is the weather tomorrow?",
    });

    expect(result.title).toBe("Catan city production");
    expect(metadataAgent.run).toHaveBeenCalledWith(
      "What is the weather tomorrow?",
    );
    await expect(conversationRepository.getChat(conversationId)).resolves.toMatchObject({
      title: "Catan city production",
      game: "Catan",
    });
  });

  it("preserves the first title while retrying a null game", async () => {
    const conversationRepository = new InMemoryConversationRepository();
    const conversationId = await conversationRepository.createConversation();
    const generated: ConversationMetadata[] = [
      { title: "Trading question", game: null },
      { title: "Replacement title", game: "Catan" },
    ];
    const run = vi
      .fn<(question: string) => Promise<ConversationMetadata>>()
      .mockImplementation(async () => generated.shift()!);
    const service = new RetrievalService(
      new RecordingVectorStore(),
      new RequestClassifierService(),
      new StubPublicSearchService(),
      conversationRepository,
      () => {
        throw new Error("should not create context agent");
      },
      () => {
        throw new Error("should not create answer agent");
      },
      () => ({ run }) as unknown as ConversationMetadataAgent,
    );

    await service.search({ conversationId, query: "Can I trade this?" });
    const result = await service.search({
      conversationId,
      query: "This is Catan. Can I trade this?",
    });

    expect(result.title).toBe("Trading question");
    expect(run).toHaveBeenCalledTimes(2);
    await expect(conversationRepository.getChat(conversationId)).resolves.toMatchObject({
      title: "Trading question",
      game: "Catan",
    });
  });

  it("treats a legacy Unknown game as unresolved", async () => {
    const conversationRepository = new InMemoryConversationRepository();
    const conversationId = await conversationRepository.createConversation();
    await conversationRepository.updateMetadata(conversationId, {
      title: "Existing title",
      game: " uNkNoWn ",
    });
    await conversationRepository.appendMessages(conversationId, [
      { role: "user", content: "Earlier question" },
      { role: "assistant", content: "Earlier answer" },
    ]);
    const run = vi.fn().mockResolvedValue({
      title: "Ignored title",
      game: "Pandemic",
    });
    const service = new RetrievalService(
      new RecordingVectorStore(),
      new RequestClassifierService(),
      new StubPublicSearchService(),
      conversationRepository,
      () => {
        throw new Error("should not create context agent");
      },
      () => {
        throw new Error("should not create answer agent");
      },
      () => ({ run }) as unknown as ConversationMetadataAgent,
    );

    const result = await service.search({
      conversationId,
      query: "How do Pandemic outbreaks work?",
    });

    expect(run).toHaveBeenCalledOnce();
    expect(result.title).toBe("Existing title");
    await expect(conversationRepository.getChat(conversationId)).resolves.toMatchObject({
      title: "Existing title",
      game: "Pandemic",
    });
  });

  it("does not invoke metadata after a concrete game is stored", async () => {
    const conversationRepository = new InMemoryConversationRepository();
    const conversationId = await conversationRepository.createConversation();
    await conversationRepository.updateMetadata(conversationId, {
      title: "Catan trading",
      game: "Catan",
    });
    await conversationRepository.appendMessages(conversationId, [
      { role: "user", content: "Earlier question" },
      { role: "assistant", content: "Earlier answer" },
    ]);
    const createMetadataAgent = vi.fn();
    const service = new RetrievalService(
      new RecordingVectorStore(),
      new RequestClassifierService(),
      new StubPublicSearchService(),
      conversationRepository,
      () => {
        throw new Error("should not create context agent");
      },
      () => {
        throw new Error("should not create answer agent");
      },
      createMetadataAgent,
    );

    const result = await service.search({
      conversationId,
      query: "Can I trade again?",
    });

    expect(result.title).toBe("Catan trading");
    expect(createMetadataAgent).not.toHaveBeenCalled();
  });

  it("keeps retrieval successful when metadata generation fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const conversationRepository = new InMemoryConversationRepository();
    const conversationId = await conversationRepository.createConversation();
    const service = new RetrievalService(
      new RecordingVectorStore(),
      new RequestClassifierService(),
      new StubPublicSearchService(),
      conversationRepository,
      () => {
        throw new Error("should not create context agent");
      },
      () => {
        throw new Error("should not create answer agent");
      },
      () =>
        ({
          run: vi.fn().mockRejectedValue(new Error("metadata unavailable")),
        }) as unknown as ConversationMetadataAgent,
    );

    const result = await service.search({
      conversationId,
      query: "What is the weather tomorrow?",
    });

    expect(result.title).toBe("New chat");
    expect(result.answer).toMatch(/only answer board-game rules questions/i);
    await expect(conversationRepository.getChat(conversationId)).resolves.toMatchObject({
      title: "New chat",
      game: null,
      messages: [
        { role: "user", content: "What is the weather tomorrow?" },
        { role: "assistant", content: result.answer },
      ],
    });
  });
});
