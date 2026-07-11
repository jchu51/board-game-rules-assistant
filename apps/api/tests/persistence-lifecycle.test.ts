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

test("still closes persistence when server close reports an error", async () => {
  const order: string[] = [];
  const serverError = new Error("server close failed");
  const server = { close(callback: (error?: Error) => void) { order.push("server"); callback(serverError); } };
  await assert.rejects(
    closePersistenceAfterServer(server, { close: async () => { order.push("persistence"); } }),
    (error) => error === serverError,
  );
  assert.deepEqual(order, ["server", "persistence"]);
});

test("preserves both server and persistence close failures", async () => {
  const serverError = new Error("server close failed");
  const persistenceError = new Error("persistence close failed");
  const server = { close(callback: (error?: Error) => void) { callback(serverError); } };
  await assert.rejects(
    closePersistenceAfterServer(server, { close: async () => { throw persistenceError; } }),
    (error) => error instanceof AggregateError && error.errors[0] === serverError && error.errors[1] === persistenceError,
  );
});
