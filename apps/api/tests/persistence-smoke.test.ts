import assert from "node:assert/strict";
import { test } from "node:test";
import { Document } from "@langchain/core/documents";
import postgres from "postgres";
import {
  cleanupExpiredGuestSessions,
  createPersistence,
  runPostgresMigrations,
  type Actor,
  type VectorStore,
} from "@board-game-rules-assistant/database";
import type { VectorStoreSimilaritySearchInput } from "@board-game-rules-assistant/rag-core";
import type { RuleAnswerAgent, RuleContextAgent } from "@board-game-rules-assistant/agent-core";
import { AccessPolicyService, PlanLimitReachedError } from "../src/application/access/access-policy-service";
import { LibraryService } from "../src/application/library/library-service";
import { RequestClassifierService } from "../src/application/retrieval/request-classifier-service";
import { RetrievalService } from "../src/application/retrieval/retrieval-service";

class DeterministicEmbeddings {
  async embedQuery(text: string) {
    const seed = [...text].reduce((sum, character) => sum + character.charCodeAt(0), 0);
    return Array.from({ length: 3072 }, (_, index) => ((seed + index) % 101) / 100);
  }
  async embedDocuments(texts: string[]) { return Promise.all(texts.map((text) => this.embedQuery(text))); }
}

async function createCleanDatabase() {
  const base = new URL(process.env.DATABASE_URL ?? "postgres://board_game_rules:board_game_rules@localhost:5432/board_game_rules");
  const name = `persistence_smoke_${crypto.randomUUID().replaceAll("-", "")}`;
  const admin = postgres(base.toString(), { max: 1, onnotice: () => {} });
  await admin.unsafe(`CREATE DATABASE ${name}`);
  const url = new URL(base); url.pathname = `/${name}`;
  const migrationClient = postgres(url.toString(), { max: 1, onnotice: () => {} });
  try {
    await runPostgresMigrations(migrationClient);
    await migrationClient.end();
  } catch (error) {
    await migrationClient.end().catch(() => undefined);
    await admin.unsafe(`DROP DATABASE ${name} WITH (FORCE)`).catch(() => undefined);
    await admin.end().catch(() => undefined);
    throw error;
  }
  return {
    databaseUrl: url.toString(),
    async dispose() { await admin.unsafe(`DROP DATABASE ${name} WITH (FORCE)`); await admin.end(); },
  };
}

test("durable PostgreSQL workflow survives restart and cleans expired guests", async () => {
  const database = await createCleanDatabase();
  const embeddings = new DeterministicEmbeddings();
  const open = () => createPersistence({
    driver: "postgres", nodeEnv: "test", databaseUrl: database.databaseUrl,
    embeddings, expectedDimensions: 3072,
  });
  let persistence: Awaited<ReturnType<typeof open>> | undefined;
  let primaryError: unknown;
  try {
    const initialPersistence = await open();
    persistence = initialPersistence;
    const adminRecord = await initialPersistence.identity.createUser({ email: "smoke-admin@example.test", displayName: "Admin", accountRole: "admin", planTier: "standard" });
    const standardRecord = await initialPersistence.identity.createUser({ email: "smoke-standard@example.test", displayName: "Standard", accountRole: "user", planTier: "standard" });
    await initialPersistence.identity.createUser({ email: "smoke-pro@example.test", displayName: "Pro", accountRole: "user", planTier: "pro" });
    const admin: Actor = { kind: "user", userId: adminRecord.id, accountRole: adminRecord.accountRole, planTier: adminRecord.planTier };
    const standard: Actor = { kind: "user", userId: standardRecord.id, accountRole: standardRecord.accountRole, planTier: standardRecord.planTier };
    const game = await initialPersistence.library.createGame({ name: "Persistence Smoke", slug: `persistence-smoke-${crypto.randomUUID()}` });
    const access = new AccessPolicyService(initialPersistence.policies, initialPersistence.library);

    const library = new LibraryService(initialPersistence.library, access, {
      ingestPdf: async (input) => {
        await initialPersistence.vectorStore.upsert([new Document({
          pageContent: "During setup each player receives five cards.",
          metadata: { ...input.metadata, documentChunkId: crypto.randomUUID(), source: input.source, loc: { pageNumber: 2 } },
        })]);
        return { documentCount: 1, chunkCount: 1 };
      },
    }, { embeddingModel: "deterministic", embeddingDimensions: 3072 });
    const global = await library.createGlobalDraft({ actor: admin, gameId: game.id, filePath: "/missing/smoke.pdf", pdfName: "smoke.pdf", fileSize: 42, title: "Smoke Rules", kind: "base_rules" });
    await library.verifyGlobalVersion(admin, global.version.id);
    await library.publishGlobalVersion(admin, global.version.id);

    for (let index = 1; index <= 3; index++) {
      await access.createPrivateDocument(standard as Extract<Actor, { kind: "user" }>, { gameId: game.id, kind: "other", title: `Private ${index}` });
    }
    await assert.rejects(
      access.createPrivateDocument(standard as Extract<Actor, { kind: "user" }>, { gameId: game.id, kind: "other", title: "Private 4" }),
      PlanLimitReachedError,
    );

    const conversation = await initialPersistence.conversations.createConversation({ actor: standard, gameId: game.id, title: "Setup" });
    const searches: VectorStoreSimilaritySearchInput[] = [];
    const recordingStore: VectorStore = {
      upsert: (records) => initialPersistence.vectorStore.upsert(records),
      similaritySearch: (input) => initialPersistence.vectorStore.similaritySearch(input),
      similaritySearchVectorWithScore: async (input) => {
        searches.push(input);
        return initialPersistence.vectorStore.similaritySearchVectorWithScore(input);
      },
    };
    const retrieval = new RetrievalService(
      recordingStore, new RequestClassifierService(), { search: async () => { throw new Error("public search must not run"); } },
      initialPersistence.conversations,
      () => ({ run: async () => "Players receive five cards." }) as unknown as RuleContextAgent,
      () => ({ run: async () => "Each player receives five cards during setup." }) as unknown as RuleAnswerAgent,
      access,
    );
    await retrieval.search({ actor: standard, conversationId: conversation.id, query: "How many cards does each player receive during setup?" });
    assert.equal(searches[0]?.topK, 5);
    assert.equal((await initialPersistence.conversations.listMessages({ actor: standard, conversationId: conversation.id }))[1]?.citations.length, 1);

    const guest = await initialPersistence.identity.createGuestSession({ expiresAt: new Date("2020-01-01T00:00:00Z") });
    const guestActor: Actor = { kind: "guest", guestSessionId: guest.id };
    const expiredConversation = await initialPersistence.conversations.createConversation({ actor: guestActor, gameId: game.id, title: "Expired" });

    await initialPersistence.close();
    persistence = await open();
    assert.equal((await persistence.conversations.getOwnedConversation({ actor: standard, conversationId: conversation.id }))?.id, conversation.id);
    const durableMessages = await persistence.conversations.listMessages({ actor: standard, conversationId: conversation.id });
    assert.deepEqual(durableMessages.map(({ role }) => role), ["user", "assistant"]);
    assert.equal(durableMessages[1]?.citations.length, 1);
    assert.deepEqual(await cleanupExpiredGuestSessions(persistence, new Date("2021-01-01T00:00:00Z")), { deletedSessions: 1 });
    assert.equal(await persistence.conversations.getConversationById({ id: expiredConversation.id }), null);
  } catch (error) {
    primaryError = error;
    throw error;
  } finally {
    let cleanupError: unknown;
    try { await persistence?.close(); } catch (error) { cleanupError = error; }
    try { await database.dispose(); } catch (error) { cleanupError ??= error; }
    if (!primaryError && cleanupError) throw cleanupError;
  }
});
