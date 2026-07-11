import assert from "node:assert/strict";
import { test } from "node:test";
import type { NextFunction, Request, Response } from "express";
import { createMemoryPersistence } from "@board-game-rules-assistant/database";
import { ActorService } from "../src/application/auth/actor-service";
import { GuestSessionExpiredError } from "../src/domain/identity/actor";
import { createActorMiddleware } from "../src/presentation/http/middleware/actor-middleware";

test("resolves a registered user into response locals", async () => {
  const persistence = await createMemoryPersistence();
  const user = await persistence.identity.createUser({ email: "actor@example.com", displayName: "Actor", accountRole: "admin", planTier: "pro" });
  const middleware = createActorMiddleware(new ActorService(persistence.identity, { nodeEnv: "production", localUserId: crypto.randomUUID() }));
  const response = { locals: {} } as Response;
  await middleware({ headers: { "x-user-id": user.id } } as unknown as Request, response, (() => {}) as NextFunction);
  assert.deepEqual(response.locals.actor, { kind: "user", userId: user.id, accountRole: "admin", planTier: "pro" });
});

test("rejects expired guest sessions with the typed error", async () => {
  const persistence = await createMemoryPersistence();
  const guest = await persistence.identity.createGuestSession({ expiresAt: new Date(Date.now() - 1) });
  const service = new ActorService(persistence.identity, { nodeEnv: "production", localUserId: crypto.randomUUID() });
  await assert.rejects(service.resolve({ "x-guest-session-id": guest.id }), GuestSessionExpiredError);
});
