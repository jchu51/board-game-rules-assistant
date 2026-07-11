import assert from "node:assert/strict";
import { test } from "node:test";
import { createMemoryPersistence } from "@board-game-rules-assistant/database";
import { ActorService, bootstrapLocalUser } from "../src/application/auth/actor-service";

const localUserId = "11111111-1111-4111-8111-111111111111";

test("bootstraps a stable local Standard user idempotently", async () => {
  const persistence = await createMemoryPersistence();
  const first = await bootstrapLocalUser(persistence.identity, localUserId);
  const second = await bootstrapLocalUser(persistence.identity, localUserId);
  assert.equal(first.id, localUserId);
  assert.equal(second.id, localUserId);
  assert.equal(second.planTier, "standard");
});

test("resolves persisted headers and local fallback without production fallback", async () => {
  const persistence = await createMemoryPersistence();
  await bootstrapLocalUser(persistence.identity, localUserId);
  const local = new ActorService(persistence.identity, { nodeEnv: "local", localUserId });
  assert.equal((await local.resolve({})).kind, "user");
  assert.equal((await local.resolve({ "x-user-id": localUserId })).kind, "user");
  await assert.rejects(local.resolve({ "x-user-id": localUserId, "x-guest-session-id": localUserId }), /exactly one/);
  const production = new ActorService(persistence.identity, { nodeEnv: "production", localUserId });
  await assert.rejects(production.resolve({}), /actor header/);
});
