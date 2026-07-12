import assert from "node:assert/strict";
import { test } from "node:test";
import { createMemoryPersistence } from "@board-game-rules-assistant/database";
import { RulebookService } from "../src/application/ingestion/rulebook-service";
import { AccessPolicyService, PlanLimitReachedError } from "../src/application/access/access-policy-service";

const actor = { kind: "user" as const, userId: "11111111-1111-4111-8111-111111111111", accountRole: "user" as const, planTier: "standard" as const };

test("persists upload game, document, version metadata, listing and deletion", async () => {
  const persistence = await createMemoryPersistence();
  await persistence.identity.createUser({ id: actor.userId, email: "owner@example.com", displayName: "Owner", accountRole: "user", planTier: "standard" });
  let metadata: Record<string, unknown> | undefined;
  const service = new RulebookService(persistence.library, new AccessPolicyService(persistence.policies, persistence.library), {
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
  const service = new RulebookService(persistence.library, new AccessPolicyService(persistence.policies, persistence.library), {
    async ingestPdf() { throw new Error("embedding failed"); },
  }, { embeddingModel: "test-model", embeddingDimensions: 3072 });
  await assert.rejects(service.upload({ actor, filePath: "/tmp/root.pdf", pdfName: "root.pdf", fileSize: 123, gameName: "Root" }), /embedding failed/);
  await assert.rejects(service.upload({ actor: { kind: "guest", guestSessionId: crypto.randomUUID() }, filePath: "/tmp/root.pdf", pdfName: "root.pdf", fileSize: 123, gameName: "Root" }), PlanLimitReachedError);
});

test("atomically admits only three concurrent Standard documents and replacement versions use no slot", async () => {
  const persistence = await createMemoryPersistence();
  await persistence.identity.createUser({ id: actor.userId, email: "quota@example.com", displayName: "Quota", accountRole: "user", planTier: "standard" });
  const service = new RulebookService(persistence.library, new AccessPolicyService(persistence.policies, persistence.library), {
    async ingestPdf() { return { documentCount: 1, chunkCount: 1 }; },
  }, { embeddingModel: "test-model", embeddingDimensions: 3072 });
  const uploads = await Promise.allSettled(Array.from({ length: 4 }, (_, index) => service.upload({
    actor, filePath: `/tmp/rules-${index}.pdf`, pdfName: `rules-${index}.pdf`, fileSize: 10, gameName: "Root",
  })));
  assert.equal(uploads.filter(({ status }) => status === "fulfilled").length, 3);
  assert.equal(uploads.filter(({ status }) => status === "rejected").length, 1);
  const first = uploads.find((result): result is PromiseFulfilledResult<Awaited<ReturnType<typeof service.upload>>> => result.status === "fulfilled")!.value;
  await service.upload({ actor, documentId: first.id, filePath: "/tmp/replacement.pdf", pdfName: "replacement.pdf", fileSize: 12, gameName: "Root" });
  assert.equal(await persistence.library.countActivePrivateDocuments({ ownerId: actor.userId }), 3);
});

test("failed initial uploads release quota, sanitize persistence, and replacement failure preserves the document", async () => {
  const persistence = await createMemoryPersistence();
  await persistence.identity.createUser({ id: actor.userId, email: "recovery@example.com", displayName: "Recovery", accountRole: "user", planTier: "standard" });
  let fail = true;
  let persistedFailure: { failureMessage: string } | undefined;
  const library = { ...persistence.library, async markVersionFailed(input: Parameters<typeof persistence.library.markVersionFailed>[0]) { persistedFailure = input; return persistence.library.markVersionFailed(input); } };
  const service = new RulebookService(library, new AccessPolicyService(persistence.policies, library), {
    async ingestPdf() {
      if (fail) throw new Error("secret-key at /Users/private/rules.pdf with provider body");
      return { documentCount: 1, chunkCount: 1 };
    },
  }, { embeddingModel: "test-model", embeddingDimensions: 3072 });
  for (let index = 0; index < 3; index += 1) {
    await assert.rejects(service.upload({ actor, filePath: `/private/${index}.pdf`, pdfName: `${index}.pdf`, fileSize: 1, gameName: "Root" }));
  }
  assert.equal(await persistence.library.countActivePrivateDocuments({ ownerId: actor.userId }), 0);
  fail = false;
  const original = await service.upload({ actor, filePath: "/tmp/good.pdf", pdfName: "good.pdf", fileSize: 1, gameName: "Root" });
  fail = true;
  await assert.rejects(service.upload({ actor, documentId: original.id, filePath: "/private/replacement.pdf", pdfName: "replacement.pdf", fileSize: 1, gameName: "Root" }));
  assert.deepEqual((await service.list(actor)).map(({ id }) => id), [original.id]);
  assert.equal(await persistence.library.countActivePrivateDocuments({ ownerId: actor.userId }), 1);
  assert.equal(persistedFailure?.failureMessage, "Rulebook processing failed");
  assert.doesNotMatch(persistedFailure?.failureMessage ?? "", /secret|Users|provider/i);
  assert.ok((persistedFailure?.failureMessage.length ?? 999) <= 64);
});
