import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { Document } from "@langchain/core/documents";
import type { RulebookDocument } from "@board-game-rules-assistant/rag-core";

import type { Persistence } from "../src/index.js";

export const runPersistenceContract = (
  name: string,
  createPersistence: () => Promise<Persistence>,
) => {
  describe(name, () => {
    test("supports stable local identities and owner-scoped library metadata", async () => {
      const persistence = await createPersistence();
      const stableId = "11111111-1111-4111-8111-111111111111";
      const user = await persistence.identity.createUser({
        id: stableId,
        email: "local@example.com",
        displayName: "Local User",
        accountRole: "user",
        planTier: "standard",
      });
      assert.equal(user.id, stableId);
      const firstGame = await persistence.library.resolveGame({ name: "Root", slug: "root" });
      const sameGame = await persistence.library.resolveGame({ name: "Root", slug: "root" });
      assert.equal(sameGame.id, firstGame.id);
      const document = await persistence.library.createDocument({
        gameId: firstGame.id,
        ownerId: user.id,
        visibility: "private",
        kind: "base_rules",
        title: "root.pdf",
        fileSizeBytes: 1234,
      });
      assert.equal(document.fileSizeBytes, 1234);
      assert.deepEqual(
        await persistence.library.listOwnedDocuments({ ownerId: user.id }),
        [{ document, game: firstGame }],
      );
      const conversationId = "22222222-2222-4222-8222-222222222222";
      const conversation = await persistence.conversations.createConversation({
        id: conversationId,
        actor: { kind: "user", userId: user.id, accountRole: "user", planTier: "standard" },
        gameId: firstGame.id,
        title: "Rules",
      });
      assert.equal(conversation.id, conversationId);
      await persistence.conversations.appendUserMessage({ actor: { kind: "user", userId: user.id, accountRole: "user", planTier: "standard" }, conversationId, content: "Alice message" });
      const bob = await persistence.identity.createUser({ email: "bob-stable@example.com", displayName: "Bob", accountRole: "user", planTier: "standard" });
      const bobActor = { kind: "user" as const, userId: bob.id, accountRole: bob.accountRole, planTier: bob.planTier };
      await assert.rejects(
        persistence.conversations.createConversation({ id: conversationId, actor: bobActor, gameId: firstGame.id, title: "Takeover" }),
      );
      assert.equal((await persistence.conversations.listMessages({ actor: bobActor, conversationId })).length, 0);
      assert.deepEqual(
        (await persistence.conversations.listMessages({ actor: { kind: "user", userId: user.id, accountRole: "user", planTier: "standard" }, conversationId })).map(({ content }) => content),
        ["Alice message"],
      );
      await persistence.close();
    });

    test("returns seeded tier policies", async () => {
      const persistence = await createPersistence();
      await persistence.healthCheck();
      assert.deepEqual(await persistence.policies.getTierPolicy("guest"), {
        tier: "guest",
        retrievalTopK: 3,
        privateUploadLimit: 0,
        conversationTtlDays: 7,
      });
      assert.deepEqual(await persistence.policies.getTierPolicy("standard"), {
        tier: "standard",
        retrievalTopK: 5,
        privateUploadLimit: 3,
        conversationTtlDays: null,
      });
      assert.deepEqual(await persistence.policies.getTierPolicy("pro"), {
        tier: "pro",
        retrievalTopK: 8,
        privateUploadLimit: null,
        conversationTtlDays: null,
      });
      await persistence.close();
    });

    test("atomically enforces a concurrent private document limit", async () => {
      const persistence = await createPersistence();
      const user = await persistence.identity.createUser({
        email: `quota-${crypto.randomUUID()}@example.com`, displayName: "Quota",
        accountRole: "user", planTier: "standard",
      });
      const game = await persistence.library.createGame({ name: `Quota ${crypto.randomUUID()}`, slug: `quota-${crypto.randomUUID()}` });
      const results = await Promise.all(Array.from({ length: 8 }, (_, index) =>
        persistence.library.createPrivateDocumentWithinLimit({
          gameId: game.id, ownerId: user.id, kind: "other", title: `Document ${index}`, limit: 3,
        }),
      ));
      assert.equal(results.filter(({ document }) => document !== null).length, 3);
      assert.equal(await persistence.library.countActivePrivateDocuments({ ownerId: user.id }), 3);
      await persistence.close();
    });

    test("never returns another owner's private document", async () => {
      const persistence = await createPersistence();
      const game = await persistence.library.createGame({
        name: "Catan",
        slug: "catan",
      });
      const alice = await persistence.identity.createUser({
        email: "alice@example.com",
        displayName: "Alice",
        accountRole: "user",
        planTier: "standard",
      });
      const bob = await persistence.identity.createUser({
        email: "bob@example.com",
        displayName: "Bob",
        accountRole: "user",
        planTier: "standard",
      });
      await persistence.library.createDocument({
        gameId: game.id,
        ownerId: alice.id,
        visibility: "private",
        kind: "base_rules",
        title: "Alice rules",
      });
      assert.equal(
        (
          await persistence.library.listRetrievableDocuments({
            gameId: game.id,
            userId: bob.id,
          })
        ).length,
        0,
      );
      await persistence.close();
    });

    test("preserves lifecycle, replacement, deletion, messages, and citations", async () => {
      const persistence = await createPersistence();
      const game = await persistence.library.createGame({ name: "Root", slug: "root" });
      const owner = await persistence.identity.createUser({
        email: "owner@example.com",
        displayName: "Owner",
        accountRole: "admin",
        planTier: "pro",
      });
      const actor = {
        kind: "user" as const,
        userId: owner.id,
        accountRole: owner.accountRole,
        planTier: owner.planTier,
      };
      const privateDocument = await persistence.library.createDocument({
        gameId: game.id,
        ownerId: owner.id,
        visibility: "private",
        kind: "other",
        title: "House rules",
      });
      assert.equal(await persistence.library.countActivePrivateDocuments({ ownerId: owner.id }), 1);

      const createVersion = (documentId: string, checksum: string) =>
        persistence.library.createVersion({
          documentId,
          checksum,
          embeddingProvider: "test",
          embeddingModel: "deterministic",
          embeddingDimensions: 3072,
        });
      const createChunk = (
        content: string,
        documentId: string,
        documentVersion: string,
        visibility: "private" | "shared",
      ): RulebookDocument =>
        new Document({
          pageContent: content,
          metadata: {
            documentId,
            documentVersion,
            gameId: game.id,
            ownerUserId: visibility === "private" ? owner.id : undefined,
            visibility,
          },
        }) as RulebookDocument;

      const first = await createVersion(privateDocument.id, "private-v1");
      await persistence.vectorStore.upsert([
        createChunk("old private rule", privateDocument.id, first.id, "private"),
      ]);
      const intruder = await persistence.identity.createUser({
        email: "intruder@example.com",
        displayName: "Intruder",
        accountRole: "user",
        planTier: "standard",
      });
      await assert.rejects(
        persistence.library.replaceActivePrivateVersion({
          versionId: first.id,
          userId: intruder.id,
          chunkCount: 1,
        }),
      );
      await persistence.library.replaceActivePrivateVersion({
        versionId: first.id,
        userId: owner.id,
        chunkCount: 1,
      });
      const failed = await createVersion(privateDocument.id, "private-failed");
      await persistence.vectorStore.upsert([
        createChunk("failed private rule", privateDocument.id, failed.id, "private"),
      ]);
      assert.equal(
        (await persistence.library.markVersionFailed({
          versionId: failed.id,
          failureCode: "EMBEDDING_FAILED",
          failureMessage: "test failure",
        })).status,
        "failed",
      );
      let privateResults = await persistence.vectorStore.similaritySearch({
        query: "private rule",
        topK: 10,
        scope: { gameId: game.id, userId: owner.id },
      });
      assert.deepEqual(privateResults.map((result) => result.pageContent), ["old private rule"]);

      const replacement = await createVersion(privateDocument.id, "private-v2");
      await persistence.vectorStore.upsert([
        createChunk("new private rule one", privateDocument.id, replacement.id, "private"),
        createChunk("new private rule two", privateDocument.id, replacement.id, "private"),
      ]);
      await persistence.library.replaceActivePrivateVersion({
        versionId: replacement.id,
        userId: owner.id,
        chunkCount: 2,
      });
      privateResults = await persistence.vectorStore.similaritySearch({
        query: "private rule",
        topK: 10,
        scope: { gameId: game.id, userId: owner.id },
      });
      assert.equal(privateResults.length, 2);
      assert.ok(privateResults.every((result) => result.metadata.documentVersion === replacement.id));

      const globalDocument = await persistence.library.createDocument({
        gameId: game.id,
        visibility: "global",
        kind: "base_rules",
        title: "Official rules",
      });
      const globalFirst = await createVersion(globalDocument.id, "global-v1");
      await persistence.vectorStore.upsert([
        createChunk("old global rule", globalDocument.id, globalFirst.id, "shared"),
      ]);
      await persistence.library.publishGlobalVersion({ versionId: globalFirst.id });
      const globalReplacement = await createVersion(globalDocument.id, "global-v2");
      await persistence.vectorStore.upsert([
        createChunk("new global rule", globalDocument.id, globalReplacement.id, "shared"),
      ]);
      await persistence.library.publishGlobalVersion({ versionId: globalReplacement.id });
      const globalResults = await persistence.vectorStore.similaritySearch({
        query: "global rule",
        topK: 10,
        scope: { gameId: game.id },
      });
      assert.deepEqual(globalResults.map((result) => result.pageContent), ["new global rule"]);
      const intruderResults = await persistence.vectorStore.similaritySearch({
        query: "rule",
        topK: 10,
        scope: { gameId: game.id, userId: intruder.id },
      });
      assert.deepEqual(
        intruderResults.map((result) => result.pageContent),
        ["new global rule"],
      );

      const conversation = await persistence.conversations.createConversation({
        actor,
        gameId: game.id,
        title: "Rules question",
      });
      await persistence.conversations.appendUserMessage({
        actor,
        conversationId: conversation.id,
        content: "What is the rule?",
      });
      const chunkIds = privateResults.map((result) => result.metadata.documentChunkId);
      assert.ok(chunkIds[0] && chunkIds[1]);
      const assistant = await persistence.conversations.appendAssistantMessageWithCitations({
        actor,
        conversationId: conversation.id,
        content: "Here are the rules.",
        model: "test-model",
        citations: [
          { documentChunkId: chunkIds[0], rank: 1, distance: 0.1, quotedText: "one" },
          { documentChunkId: chunkIds[1], rank: 2, distance: 0.2, quotedText: "two" },
        ],
      });
      assert.equal(assistant.citations.length, 2);
      const messageList = await persistence.conversations.listMessages({
        actor,
        conversationId: conversation.id,
      });
      assert.deepEqual(messageList.map((message) => message.role), ["user", "assistant"]);
      assert.equal(messageList[1]?.citations.length, 2);

      assert.ok(
        await persistence.library.softDeleteDocument({
          documentId: privateDocument.id,
          ownerId: owner.id,
        }),
      );
      assert.equal(await persistence.library.countActivePrivateDocuments({ ownerId: owner.id }), 0);
      assert.equal(
        (await persistence.library.listRetrievableDocuments({ gameId: game.id, userId: owner.id }))
          .some((document) => document.id === privateDocument.id),
        false,
      );
      await persistence.close();
    });
  });
};
