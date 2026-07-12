import assert from "node:assert/strict";
import type { Server } from "node:http";
import { test } from "node:test";
import { createMemoryPersistence } from "@board-game-rules-assistant/database";
import type { ActorService } from "../src/application/auth/actor-service";
import { ConversationService } from "../src/application/conversations/conversation-service";
import { createApp } from "../src/presentation/http/app";
import { ConversationRouter } from "../src/presentation/http/conversations/conversation-router";
import { testConfig } from "./test-config";

const close = (server: Server) => new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));

test("conversation routes create, list, get, delete and conceal another owner", async () => {
  const persistence = await createMemoryPersistence();
  const game = await persistence.library.createGame({ name: "Root", slug: "router-root" });
  const alice = await persistence.identity.createUser({ email: "router-a@x.test", displayName: "A", accountRole: "user", planTier: "standard" });
  const bob = await persistence.identity.createUser({ email: "router-b@x.test", displayName: "B", accountRole: "user", planTier: "standard" });
  let actor = { kind: "user" as const, userId: alice.id, accountRole: alice.accountRole, planTier: alice.planTier };
  const service = new ConversationService(persistence.conversations);
  const router = new ConversationRouter(service, { resolve: async () => actor } as unknown as ActorService);
  const server = createApp({ config: testConfig, routers: [router.router] }).listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address(); assert.ok(address && typeof address === "object");
  const base = `http://127.0.0.1:${address.port}`;
  try {
    const create = await fetch(`${base}/conversations`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ gameId: game.id, title: "Setup" }) });
    assert.equal(create.status, 201); const conversation = await create.json() as { id: string };
    assert.equal((await fetch(`${base}/conversations`)).status, 200);
    assert.equal((await fetch(`${base}/conversations/${conversation.id}`)).status, 200);
    actor = { kind: "user", userId: bob.id, accountRole: bob.accountRole, planTier: bob.planTier };
    assert.equal((await fetch(`${base}/conversations/${conversation.id}`)).status, 404);
    assert.equal((await fetch(`${base}/conversations/${conversation.id}`, { method: "DELETE" })).status, 404);
    actor = { kind: "user", userId: alice.id, accountRole: alice.accountRole, planTier: alice.planTier };
    assert.equal((await fetch(`${base}/conversations/${conversation.id}`, { method: "DELETE" })).status, 204);
  } finally { await close(server); }
});
