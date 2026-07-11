import assert from "node:assert/strict";
import { test } from "node:test";
import type { Server } from "node:http";
import type { Actor } from "@board-game-rules-assistant/database";
import type { ActorService } from "../src/application/auth/actor-service";
import type { LibraryService } from "../src/application/library/library-service";
import { InvalidLibraryTransitionError } from "../src/application/library/library-service";
import { AdminRequiredError } from "../src/application/access/access-policy-service";
import { AdminLibraryRouter } from "../src/presentation/http/admin/admin-library-router";
import { createApp } from "../src/presentation/http/app";
import { testConfig } from "./test-config";

const admin = { kind: "user" as const, userId: crypto.randomUUID(), accountRole: "admin" as const, planTier: "standard" as const };
const user = { ...admin, userId: crypto.randomUUID(), accountRole: "user" as const };

const start = async (service: LibraryService, actor: Actor = admin) => {
  const router = new AdminLibraryRouter(service, { resolve: async () => actor } as unknown as ActorService, { uploadDirectory: "/tmp", maxUploadSizeBytes: 1024 });
  const server = createApp({ config: testConfig, routers: [router.router] }).listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address(); assert.ok(address && typeof address === "object");
  return { server, base: `http://127.0.0.1:${address.port}` };
};

const close = (server: Server) => new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));

test("multipart create passes the resolved admin, file, game and document fields", async () => {
  const gameId = crypto.randomUUID(); const documentId = crypto.randomUUID();
  let received: Parameters<LibraryService["createGlobalDraft"]>[0] | undefined;
  const service = { async createGlobalDraft(input: Parameters<LibraryService["createGlobalDraft"]>[0]) {
    received = input;
    return { document: { id: documentId, gameId, title: "Rules", kind: "base_rules" }, version: { id: crypto.randomUUID(), status: "ready", versionNumber: 1 } };
  } } as unknown as LibraryService;
  const { server, base } = await start(service);
  try {
    const body = new FormData(); body.set("title", "Rules"); body.set("kind", "base_rules"); body.set("file", new Blob(["pdf"], { type: "application/pdf" }), "rules.pdf");
    assert.equal((await fetch(`${base}/admin/games/${gameId}/documents`, { method: "POST", body })).status, 200);
    assert.deepEqual(received?.actor, admin); assert.equal(received?.gameId, gameId); assert.equal(received?.pdfName, "rules.pdf");
  } finally { await close(server); }
});

test("verify and publish pass the resolved actor and version id", async () => {
  const calls: string[] = [];
  const service = {
    async verifyGlobalVersion(resolved: typeof admin, id: string) { assert.deepEqual(resolved, admin); calls.push(`verify:${id}`); return { id, status: "ready", verifiedAt: new Date(), verifiedBy: admin.userId }; },
    async publishGlobalVersion(resolved: typeof admin, id: string) { assert.deepEqual(resolved, admin); calls.push(`publish:${id}`); return { id, status: "published", verifiedAt: new Date(), verifiedBy: admin.userId }; },
  } as unknown as LibraryService;
  const { server, base } = await start(service);
  try {
    const id = crypto.randomUUID();
    assert.equal((await fetch(`${base}/admin/document-versions/${id}/verify`, { method: "POST" })).status, 200);
    assert.equal((await fetch(`${base}/admin/document-versions/${id}/publish`, { method: "POST" })).status, 200);
    assert.deepEqual(calls, [`verify:${id}`, `publish:${id}`]);
  } finally { await close(server); }
});

test("maps non-admin and illegal transitions to typed HTTP errors", async () => {
  const forbidden = { async publishGlobalVersion() { throw new AdminRequiredError(); } } as unknown as LibraryService;
  const first = await start(forbidden, user);
  try {
    const response = await fetch(`${first.base}/admin/document-versions/${crypto.randomUUID()}/publish`, { method: "POST" });
    assert.equal(response.status, 403); assert.deepEqual(await response.json(), { code: "ADMIN_REQUIRED" });
  } finally { await close(first.server); }
  const illegal = { async verifyGlobalVersion() { throw new InvalidLibraryTransitionError("not ready"); } } as unknown as LibraryService;
  const second = await start(illegal);
  try {
    const response = await fetch(`${second.base}/admin/document-versions/${crypto.randomUUID()}/verify`, { method: "POST" });
    assert.equal(response.status, 409); assert.deepEqual(await response.json(), { code: "INVALID_LIBRARY_TRANSITION" });
  } finally { await close(second.server); }
});

test("returns a typed validation error for an invalid multipart create", async () => {
  const service = {} as LibraryService; const { server, base } = await start(service);
  try {
    const body = new FormData(); body.set("file", new Blob(["pdf"], { type: "application/pdf" }), "rules.pdf");
    const response = await fetch(`${base}/admin/games/${crypto.randomUUID()}/documents`, { method: "POST", body });
    assert.equal(response.status, 400); assert.deepEqual(await response.json(), { code: "INVALID_REQUEST" });
  } finally { await close(server); }
});
