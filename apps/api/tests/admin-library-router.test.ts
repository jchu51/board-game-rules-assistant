import assert from "node:assert/strict";
import { test } from "node:test";
import express from "express";
import type { ActorService } from "../src/application/auth/actor-service";
import type { LibraryService } from "../src/application/library/library-service";
import { AdminLibraryRouter } from "../src/presentation/http/admin/admin-library-router";

const actor = { kind: "user" as const, userId: crypto.randomUUID(), accountRole: "admin" as const, planTier: "standard" as const };

test("admin verification and publication endpoints pass the resolved actor and version id", async () => {
  const calls: string[] = [];
  const service = {
    async verifyGlobalVersion(resolved: typeof actor, id: string) { assert.deepEqual(resolved, actor); calls.push(`verify:${id}`); return { id, status: "ready", verifiedAt: new Date(), verifiedBy: actor.userId }; },
    async publishGlobalVersion(resolved: typeof actor, id: string) { assert.deepEqual(resolved, actor); calls.push(`publish:${id}`); return { id, status: "published", verifiedAt: new Date(), verifiedBy: actor.userId }; },
  } as unknown as LibraryService;
  const router = new AdminLibraryRouter(service, { resolve: async () => actor } as unknown as ActorService, { uploadDirectory: "/tmp", maxUploadSizeBytes: 1024 });
  const app = express(); app.use(router.router);
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  assert.ok(address && typeof address === "object");
  const base = `http://127.0.0.1:${address.port}`;
  try {
    const id = crypto.randomUUID();
    assert.equal((await fetch(`${base}/admin/document-versions/${id}/verify`, { method: "POST" })).status, 200);
    assert.equal((await fetch(`${base}/admin/document-versions/${id}/publish`, { method: "POST" })).status, 200);
    assert.deepEqual(calls, [`verify:${id}`, `publish:${id}`]);
  } finally { server.close(); }
});
