import assert from "node:assert/strict";
import { test } from "node:test";
import { createMemoryPersistence } from "@board-game-rules-assistant/database";
import {
  AccessPolicyService,
  AdminRequiredError,
  PlanLimitReachedError,
} from "../src/application/access/access-policy-service";

const standardActor = {
  kind: "user" as const,
  userId: "11111111-1111-4111-8111-111111111111",
  accountRole: "user" as const,
  planTier: "standard" as const,
};

test("returns admin topK override without changing plan quota", async () => {
  const persistence = await createMemoryPersistence();
  const service = new AccessPolicyService(persistence.policies, persistence.library);
  const policy = await service.getEffectivePolicy({ ...standardActor, accountRole: "admin" });
  assert.equal(policy.retrievalTopK, 10);
  assert.equal(policy.privateUploadLimit, 3);
});

test("returns exact Guest, Standard, and Pro policies", async () => {
  const persistence = await createMemoryPersistence();
  const service = new AccessPolicyService(persistence.policies, persistence.library);
  assert.deepEqual(await service.getEffectivePolicy({ kind: "guest", guestSessionId: "guest" }), {
    tier: "guest", retrievalTopK: 3, privateUploadLimit: 0, conversationTtlDays: 7,
  });
  assert.equal((await service.getEffectivePolicy(standardActor)).privateUploadLimit, 3);
  assert.equal((await service.getEffectivePolicy({ ...standardActor, planTier: "pro" })).privateUploadLimit, null);
});

test("rejects a fourth active Standard document", async () => {
  const persistence = await createMemoryPersistence();
  await persistence.identity.createUser({ id: standardActor.userId, email: "standard@example.com", displayName: "Standard", accountRole: "user", planTier: "standard" });
  const game = await persistence.library.createGame({ name: "Root", slug: "root" });
  for (let index = 0; index < 3; index += 1) {
    await persistence.library.createDocument({ gameId: game.id, ownerId: standardActor.userId, visibility: "private", kind: "other", title: `Rules ${index}` });
  }
  const service = new AccessPolicyService(persistence.policies, persistence.library);
  await assert.rejects(() => service.assertCanCreatePrivateDocument(standardActor), (error: unknown) => {
    assert.ok(error instanceof PlanLimitReachedError);
    if (!(error instanceof PlanLimitReachedError)) return false;
    assert.equal(error.currentUsage, 3);
    assert.equal(error.limit, 3);
    return true;
  });
});

test("requires admin for admin-only actions", () => {
  const service = new AccessPolicyService({ getTierPolicy: async () => { throw new Error("unused"); } }, { countActivePrivateDocuments: async () => 0 } as never);
  assert.throws(() => service.assertAdmin(standardActor), AdminRequiredError);
  assert.doesNotThrow(() => service.assertAdmin({ ...standardActor, accountRole: "admin" }));
});
