import assert from "node:assert/strict";
import { test } from "node:test";
import { createMemoryPersistence, PersistenceNotFoundError } from "@board-game-rules-assistant/database";
import { ConversationService } from "../src/application/conversations/conversation-service";

test("registered conversations are permanent and listed for only their owner", async () => {
  const persistence = await createMemoryPersistence();
  const game = await persistence.library.createGame({ name: "Root", slug: "root" });
  const alice = await persistence.identity.createUser({ email: "alice@x.test", displayName: "Alice", accountRole: "user", planTier: "standard" });
  const bob = await persistence.identity.createUser({ email: "bob@x.test", displayName: "Bob", accountRole: "user", planTier: "standard" });
  const service = new ConversationService(persistence.conversations);
  const actor = { kind: "user" as const, userId: alice.id, accountRole: alice.accountRole, planTier: alice.planTier };
  const created = await service.create({ actor, gameId: game.id, title: "Setup" });
  assert.equal(created.userId, alice.id); assert.equal(created.guestSessionId, null); assert.equal(created.expiresAt, null);
  assert.deepEqual((await service.list(actor)).map(({ id }) => id), [created.id]);
  await assert.rejects(service.get({ kind: "user", userId: bob.id, accountRole: bob.accountRole, planTier: bob.planTier }, created.id), PersistenceNotFoundError);
});

test("rejects a well-formed nonexistent selected game", async () => {
  const persistence = await createMemoryPersistence();
  const user = await persistence.identity.createUser({ email: "missing@x.test", displayName: "Missing", accountRole: "user", planTier: "standard" });
  const service = new ConversationService(persistence.conversations);
  await assert.rejects(
    service.create({
      actor: { kind: "user", userId: user.id, accountRole: user.accountRole, planTier: user.planTier },
      gameId: crypto.randomUUID(),
      title: "Missing",
    }),
    PersistenceNotFoundError,
  );
});

test("guest conversations inherit the session's exact expiry and include ordered messages", async () => {
  const persistence = await createMemoryPersistence();
  const game = await persistence.library.createGame({ name: "Azul", slug: "azul" });
  const expiresAt = new Date("2030-01-08T12:00:00.000Z");
  const guest = await persistence.identity.createGuestSession({ expiresAt });
  const actor = { kind: "guest" as const, guestSessionId: guest.id };
  const service = new ConversationService(persistence.conversations);
  const created = await service.create({ actor, gameId: game.id, title: "Scoring" });
  assert.deepEqual(created.expiresAt, expiresAt);
  await persistence.conversations.appendUserMessage({ actor, conversationId: created.id, content: "first" });
  await persistence.conversations.appendAssistantMessageWithCitations({ actor, conversationId: created.id, content: "second", model: "test", citations: [] });
  const detail = await service.get(actor, created.id);
  assert.deepEqual(detail.messages.map(({ content }) => content), ["first", "second"]);
});
