import assert from "node:assert/strict";
import { test } from "node:test";
import { createMemoryPersistence } from "@board-game-rules-assistant/database";
import { RulebookService } from "../src/application/ingestion/rulebook-service";

const actor = { kind: "user" as const, userId: "11111111-1111-4111-8111-111111111111", accountRole: "user" as const, planTier: "standard" as const };

test("persists upload game, document, version metadata, listing and deletion", async () => {
  const persistence = await createMemoryPersistence();
  await persistence.identity.createUser({ id: actor.userId, email: "owner@example.com", displayName: "Owner", accountRole: "user", planTier: "standard" });
  let metadata: Record<string, unknown> | undefined;
  const service = new RulebookService(persistence.library, {
    async ingestPdf(input) { metadata = input.metadata; return { documentCount: 1, chunkCount: 2 }; },
  }, { embeddingModel: "test-model", embeddingDimensions: 3072 });
  const result = await service.upload({ actor, filePath: "/tmp/root.pdf", pdfName: "root.pdf", fileSize: 123, gameName: "Root" });
  assert.equal(metadata?.documentVersion, result.versionId);
  assert.equal(metadata?.documentId, result.id);
  assert.equal(metadata?.gameId, result.gameId);
  assert.deepEqual(await service.list(actor), [{ id: result.id, gameName: "Root", pdfName: "root.pdf", fileSize: 123 }]);
  assert.equal(await service.delete(actor, result.id), true);
  assert.deepEqual(await service.list(actor), []);
});

test("marks a processing version failed and rejects guest uploads", async () => {
  const persistence = await createMemoryPersistence();
  await persistence.identity.createUser({ id: actor.userId, email: "owner@example.com", displayName: "Owner", accountRole: "user", planTier: "standard" });
  const service = new RulebookService(persistence.library, {
    async ingestPdf() { throw new Error("embedding failed"); },
  }, { embeddingModel: "test-model", embeddingDimensions: 3072 });
  await assert.rejects(service.upload({ actor, filePath: "/tmp/root.pdf", pdfName: "root.pdf", fileSize: 123, gameName: "Root" }), /embedding failed/);
  await assert.rejects(service.upload({ actor: { kind: "guest", guestSessionId: crypto.randomUUID() }, filePath: "/tmp/root.pdf", pdfName: "root.pdf", fileSize: 123, gameName: "Root" }), /Guests cannot upload/);
});
