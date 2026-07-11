import assert from "node:assert/strict";
import { describe, test } from "node:test";

import type { Persistence } from "../src/index.js";

export const runPersistenceContract = (
  name: string,
  createPersistence: () => Promise<Persistence>,
) => {
  describe(name, () => {
    test("returns seeded tier policies", async () => {
      const persistence = await createPersistence();
      assert.deepEqual(await persistence.policies.getTierPolicy("guest"), {
        tier: "guest",
        retrievalTopK: 3,
        privateUploadLimit: 0,
        conversationTtlDays: 7,
      });
      assert.deepEqual(await persistence.policies.getTierPolicy("standard"), {
        tier: "standard",
        retrievalTopK: 5,
        privateUploadLimit: 3,
        conversationTtlDays: null,
      });
      assert.deepEqual(await persistence.policies.getTierPolicy("pro"), {
        tier: "pro",
        retrievalTopK: 8,
        privateUploadLimit: null,
        conversationTtlDays: null,
      });
      await persistence.close();
    });

    test("never returns another owner's private document", async () => {
      const persistence = await createPersistence();
      const game = await persistence.library.createGame({
        name: "Catan",
        slug: "catan",
      });
      const alice = await persistence.identity.createUser({
        email: "alice@example.com",
        displayName: "Alice",
        accountRole: "user",
        planTier: "standard",
      });
      const bob = await persistence.identity.createUser({
        email: "bob@example.com",
        displayName: "Bob",
        accountRole: "user",
        planTier: "standard",
      });
      await persistence.library.createDocument({
        gameId: game.id,
        ownerId: alice.id,
        visibility: "private",
        kind: "base_rules",
        title: "Alice rules",
      });
      assert.equal(
        (
          await persistence.library.listRetrievableDocuments({
            gameId: game.id,
            userId: bob.id,
          })
        ).length,
        0,
      );
      await persistence.close();
    });
  });
};
