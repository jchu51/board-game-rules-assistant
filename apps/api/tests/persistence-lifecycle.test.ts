import assert from "node:assert/strict";
import { test } from "node:test";
import { createMemoryPersistence } from "@board-game-rules-assistant/database";
import { preparePersistence, closePersistenceAfterServer } from "../src/application/runtime/persistence-lifecycle";

test("health checks and bootstraps before listen composition continues", async () => {
  const persistence = await createMemoryPersistence();
  const order: string[] = [];
  persistence.healthCheck = async () => { order.push("health"); };
  const prepared = await preparePersistence(persistence, "local", "11111111-1111-4111-8111-111111111111");
  order.push("listen");
  assert.deepEqual(order, ["health", "listen"]);
  assert.equal(prepared?.id, "11111111-1111-4111-8111-111111111111");
});

test("closes persistence after the server", async () => {
  const order: string[] = [];
  const server = { close(callback: (error?: Error) => void) { order.push("server"); callback(); } };
  await closePersistenceAfterServer(server, { close: async () => { order.push("persistence"); } });
  assert.deepEqual(order, ["server", "persistence"]);
});
