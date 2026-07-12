import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Document } from "@langchain/core/documents";
import type { RuleAnswerAgent, RuleContextAgent } from "@board-game-rules-assistant/agent-core";
import { createMemoryPersistence, PersistenceNotFoundError, type Actor, type ConversationRepository } from "@board-game-rules-assistant/database";
import type { VectorStore, VectorStoreSimilaritySearchInput } from "@board-game-rules-assistant/rag-core";
import { AccessPolicyService } from "../src/application/access/access-policy-service";
import { RequestClassifierService } from "../src/application/retrieval/request-classifier-service";
import { RetrievalService } from "../src/application/retrieval/retrieval-service";

class RecordingVectorStore implements VectorStore {
  searches: VectorStoreSimilaritySearchInput[] = [];
  results: any[] = [];
  async upsert(): Promise<void> {}
  async similaritySearch(): Promise<any[]> { return []; }
  async similaritySearchVectorWithScore(input: VectorStoreSimilaritySearchInput): Promise<any[]> { this.searches.push(input); return this.results; }
}

const publicSearch = { search: async () => [] };
const contextAgent = () => ({ run: async () => "relevant rules" }) as unknown as RuleContextAgent;
const answerAgent = () => ({ run: async () => "answer" }) as unknown as RuleAnswerAgent;

async function setup(tier: "standard" | "pro" = "standard", role: "user" | "admin" = "user") {
  const persistence = await createMemoryPersistence();
  const game = await persistence.library.createGame({ name: "Catan", slug: crypto.randomUUID() });
  const user = await persistence.identity.createUser({ email: `${crypto.randomUUID()}@x.test`, displayName: "Player", accountRole: role, planTier: tier });
  const actor: Actor = { kind: "user", userId: user.id, accountRole: user.accountRole, planTier: user.planTier };
  const conversation = await persistence.conversations.createConversation({ actor, gameId: game.id, title: "Rules" });
  return { persistence, game, actor, conversation };
}

function service(repository: ConversationRepository, vectorStore: RecordingVectorStore, access: AccessPolicyService, answer = answerAgent) {
  return new RetrievalService(vectorStore, new RequestClassifierService(), publicSearch, repository, contextAgent, answer, access);
}

describe("RetrievalService authorization", () => {
  for (const row of [
    { name: "guest", topK: 3 }, { name: "standard", topK: 5 }, { name: "pro", topK: 8 }, { name: "admin", topK: 10 },
  ] as const) {
    it(`uses ${row.name} server policy topK and the owned conversation scope`, async () => {
      const persistence = await createMemoryPersistence();
      const game = await persistence.library.createGame({ name: "Game", slug: crypto.randomUUID() });
      let actor: Actor;
      if (row.name === "guest") {
        const guest = await persistence.identity.createGuestSession({ expiresAt: new Date("2030-01-01") });
        actor = { kind: "guest", guestSessionId: guest.id };
      } else {
        const user = await persistence.identity.createUser({ email: `${crypto.randomUUID()}@x.test`, displayName: "P", accountRole: row.name === "admin" ? "admin" : "user", planTier: row.name === "pro" ? "pro" : "standard" });
        actor = { kind: "user", userId: user.id, accountRole: user.accountRole, planTier: user.planTier };
      }
      const conversation = await persistence.conversations.createConversation({ actor, gameId: game.id, title: "Rules" });
      const vector = new RecordingVectorStore();
      await service(persistence.conversations, vector, new AccessPolicyService(persistence.policies, persistence.library)).search({ actor, conversationId: conversation.id, query: "How many cards are dealt?" });
      assert.deepEqual(vector.searches[0], { query: "How many cards are dealt?", topK: row.topK, scope: { gameId: game.id, ...(actor.kind === "user" ? { userId: actor.userId } : {}) } });
    });
  }

  it("does not expose another user's conversation or scope", async () => {
    const { persistence, conversation } = await setup();
    const other = await persistence.identity.createUser({ email: "other@x.test", displayName: "Other", accountRole: "user", planTier: "standard" });
    const actor: Actor = { kind: "user", userId: other.id, accountRole: other.accountRole, planTier: other.planTier };
    const vector = new RecordingVectorStore();
    await assert.rejects(service(persistence.conversations, vector, new AccessPolicyService(persistence.policies, persistence.library)).search({ actor, conversationId: conversation.id, query: "How many cards?" }), PersistenceNotFoundError);
    assert.equal(vector.searches.length, 0);
  });
});

describe("RetrievalService persistence atomicity", () => {
  it("keeps the user message but writes no assistant message when model work fails", async () => {
    const { persistence, actor, conversation } = await setup();
    const vector = new RecordingVectorStore();
    vector.results = [[new Document({ pageContent: "Deal five cards.", metadata: { documentChunkId: crypto.randomUUID(), documentId: crypto.randomUUID() } }), 0.9]];
    const failing = () => ({ run: async () => { throw new Error("model failed"); } }) as unknown as RuleAnswerAgent;
    await assert.rejects(service(persistence.conversations, vector, new AccessPolicyService(persistence.policies, persistence.library), failing).search({ actor, conversationId: conversation.id, query: "How many cards are dealt?" }), /model failed/);
    assert.deepEqual((await persistence.conversations.listMessages({ actor, conversationId: conversation.id })).map(({ role }) => role), ["user"]);
  });

  it("writes the assistant and ranked citations in one repository call", async () => {
    const { persistence, actor, conversation } = await setup();
    const vector = new RecordingVectorStore();
    const chunkIds = [crypto.randomUUID(), crypto.randomUUID()];
    vector.results = chunkIds.map((documentChunkId, index) => [new Document({ pageContent: `Rule ${index + 1}`, metadata: { documentChunkId, documentId: crypto.randomUUID() } }), 0.9 - index * 0.1]);
    let calls = 0; let captured: any;
    const repository: ConversationRepository = { ...persistence.conversations, appendAssistantMessageWithCitations: async (input) => { calls++; captured = input; return persistence.conversations.appendAssistantMessageWithCitations(input); } };
    await service(repository, vector, new AccessPolicyService(persistence.policies, persistence.library)).search({ actor, conversationId: conversation.id, query: "How many cards are dealt?" });
    assert.equal(calls, 1);
    assert.deepEqual(captured.citations.map((c: any) => ({ id: c.documentChunkId, rank: c.rank, distance: c.distance, quote: c.quotedText })), [
      { id: chunkIds[0], rank: 1, distance: 0.1, quote: "Rule 1" },
      { id: chunkIds[1], rank: 2, distance: 0.2, quote: "Rule 2" },
    ]);
  });
});
