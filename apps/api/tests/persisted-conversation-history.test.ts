import assert from "node:assert/strict";
import { test } from "node:test";
import { createMemoryPersistence } from "@board-game-rules-assistant/database";
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
