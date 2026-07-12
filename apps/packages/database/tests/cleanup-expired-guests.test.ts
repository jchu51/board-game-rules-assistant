import assert from "node:assert/strict";
import { test } from "node:test";
import { cleanupExpiredGuestSessions, createMemoryPersistence } from "../src/index.js";

test("cleanup is idempotent and cascades expired guest conversations and messages", async () => {
  const persistence = await createMemoryPersistence();
  const game = await persistence.library.createGame({ name: "Root", slug: "root-cleanup" });
  const expired = await persistence.identity.createGuestSession({ expiresAt: new Date("2025-01-01T00:00:00Z") });
  const active = await persistence.identity.createGuestSession({ expiresAt: new Date("2027-01-01T00:00:00Z") });
  const expiredActor = { kind: "guest" as const, guestSessionId: expired.id };
  const conversation = await persistence.conversations.createConversation({ actor: expiredActor, gameId: game.id, title: "old" });
  await persistence.conversations.appendUserMessage({ actor: expiredActor, conversationId: conversation.id, content: "gone" });
  await persistence.conversations.createConversation({ actor: { kind: "guest", guestSessionId: active.id }, gameId: game.id, title: "active" });
  assert.deepEqual(await cleanupExpiredGuestSessions(persistence, new Date("2026-01-01T00:00:00Z")), { deletedSessions: 1 });
  assert.equal(await persistence.identity.getGuestSession({ id: expired.id }), null);
  assert.equal(await persistence.conversations.getConversationById({ id: conversation.id }), null);
  assert.deepEqual(await cleanupExpiredGuestSessions(persistence, new Date("2026-01-01T00:00:00Z")), { deletedSessions: 0 });
});
