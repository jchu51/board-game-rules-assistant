import assert from "node:assert/strict";
import { test } from "node:test";
import { createMemoryPersistence } from "@board-game-rules-assistant/database";
import { PersistenceNotFoundError } from "@board-game-rules-assistant/database";
import { PersistedConversationHistory } from "../src/application/retrieval/persisted-conversation-history";

test("creates requested conversation once and persists turns for its actor", async () => {
  const persistence = await createMemoryPersistence();
  const user = await persistence.identity.createUser({ email: "chat@example.com", displayName: "Chat", accountRole: "user", planTier: "standard" });
  const game = await persistence.library.resolveGame({ name: "Root", slug: "root" });
  const actor = { kind: "user" as const, userId: user.id, accountRole: user.accountRole, planTier: user.planTier };
  const id = crypto.randomUUID();
  const history = new PersistedConversationHistory(persistence.conversations);
  await history.ensureConversation(actor, id, game.id);
  await history.ensureConversation(actor, id, game.id);
  await history.appendMessages(actor, id, [{ role: "user", content: "How?" }, { role: "assistant", content: "Like this." }]);
  assert.deepEqual(await history.getMessages(actor, id), [{ role: "user", content: "How?" }, { role: "assistant", content: "Like this." }]);
});

test("rejects another actor's conversation id without changing its messages", async () => {
  const persistence = await createMemoryPersistence();
  const alice = await persistence.identity.createUser({ email: "alice-chat@example.com", displayName: "Alice", accountRole: "user", planTier: "standard" });
  const bob = await persistence.identity.createUser({ email: "bob-chat@example.com", displayName: "Bob", accountRole: "user", planTier: "standard" });
  const game = await persistence.library.resolveGame({ name: "Root", slug: "root" });
  const aliceActor = { kind: "user" as const, userId: alice.id, accountRole: alice.accountRole, planTier: alice.planTier };
  const bobActor = { kind: "user" as const, userId: bob.id, accountRole: bob.accountRole, planTier: bob.planTier };
  const id = crypto.randomUUID();
  const history = new PersistedConversationHistory(persistence.conversations);
  await history.ensureConversation(aliceActor, id, game.id);
  await history.appendMessages(aliceActor, id, [{ role: "user", content: "Alice secret" }]);
  await assert.rejects(history.ensureConversation(bobActor, id, game.id), PersistenceNotFoundError);
  assert.deepEqual(await history.getMessages(aliceActor, id), [{ role: "user", content: "Alice secret" }]);
  assert.deepEqual(await history.getMessages(bobActor, id), []);
});
