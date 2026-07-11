import assert from "node:assert/strict";
import { test } from "node:test";
import { createMemoryPersistence, type Actor } from "@board-game-rules-assistant/database";
import { AccessPolicyService, AdminRequiredError } from "../src/application/access/access-policy-service";
import { LibraryService, InvalidLibraryTransitionError } from "../src/application/library/library-service";

const admin: Actor = { kind: "user", userId: "11111111-1111-4111-8111-111111111111", accountRole: "admin", planTier: "standard" };
const user: Actor = { ...admin, userId: "22222222-2222-4222-8222-222222222222", accountRole: "user" };

const setup = async (fail = false) => {
  const persistence = await createMemoryPersistence();
  await persistence.identity.createUser({ id: admin.userId, email: "admin@example.com", displayName: "Admin", accountRole: "admin", planTier: "standard" });
  const game = await persistence.library.createGame({ name: "Root", slug: "root" });
  const service = new LibraryService(
    persistence.library,
    new AccessPolicyService(persistence.policies, persistence.library),
    { async ingestPdf() { if (fail) throw new Error("bad pdf"); return { documentCount: 1, chunkCount: 2 }; } },
    { embeddingModel: "test", embeddingDimensions: 3072 },
  );
  return { persistence, game, service };
};

test("normal users cannot create or publish global versions", async () => {
  const { game, service } = await setup();
  await assert.rejects(() => service.createGlobalDraft({ actor: user, gameId: game.id, filePath: "/tmp/root.pdf", pdfName: "root.pdf", fileSize: 1, title: "Rules", kind: "base_rules" }), AdminRequiredError);
  await assert.rejects(() => service.publishGlobalVersion(user, crypto.randomUUID()), AdminRequiredError);
});

test("a ready global version cannot publish until an admin verifies it", async () => {
  const { game, service } = await setup();
  const created = await service.createGlobalDraft({ actor: admin, gameId: game.id, filePath: "/tmp/root.pdf", pdfName: "root.pdf", fileSize: 1, title: "Rules", kind: "base_rules" });
  await assert.rejects(() => service.publishGlobalVersion(admin, created.version.id), InvalidLibraryTransitionError);
  const verified = await service.verifyGlobalVersion(admin, created.version.id);
  assert.equal(verified.verifiedBy, admin.userId);
  assert.ok(verified.verifiedAt instanceof Date);
  assert.equal((await service.publishGlobalVersion(admin, created.version.id)).status, "published");
});

test("publishing version two archives version one atomically", async () => {
  const { game, service, persistence } = await setup();
  const first = await service.createGlobalDraft({ actor: admin, gameId: game.id, filePath: "/tmp/v1.pdf", pdfName: "v1.pdf", fileSize: 1, title: "Rules", kind: "base_rules" });
  await service.verifyGlobalVersion(admin, first.version.id);
  await service.publishGlobalVersion(admin, first.version.id);
  const second = await service.createGlobalDraft({ actor: admin, gameId: game.id, documentId: first.document.id, filePath: "/tmp/v2.pdf", pdfName: "v2.pdf", fileSize: 2, title: "Rules", kind: "base_rules" });
  await service.verifyGlobalVersion(admin, second.version.id);
  await service.publishGlobalVersion(admin, second.version.id);
  assert.equal((await persistence.library.getVersion({ versionId: first.version.id }))?.status, "archived");
  assert.equal((await persistence.library.getVersion({ versionId: second.version.id }))?.status, "published");
});

test("a failed replacement leaves the published version active", async () => {
  const good = await setup();
  const first = await good.service.createGlobalDraft({ actor: admin, gameId: good.game.id, filePath: "/tmp/v1.pdf", pdfName: "v1.pdf", fileSize: 1, title: "Rules", kind: "base_rules" });
  await good.service.verifyGlobalVersion(admin, first.version.id);
  await good.service.publishGlobalVersion(admin, first.version.id);
  const failing = new LibraryService(good.persistence.library, new AccessPolicyService(good.persistence.policies, good.persistence.library), { async ingestPdf() { throw new Error("bad pdf"); } }, { embeddingModel: "test", embeddingDimensions: 3072 });
  await assert.rejects(() => failing.createGlobalDraft({ actor: admin, gameId: good.game.id, documentId: first.document.id, filePath: "/tmp/v2.pdf", pdfName: "v2.pdf", fileSize: 1, title: "Rules", kind: "base_rules" }), /bad pdf/);
  assert.equal((await good.persistence.library.getVersion({ versionId: first.version.id }))?.status, "published");
});
