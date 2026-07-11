import assert from "node:assert/strict";
import { test } from "node:test";
import postgres from "postgres";
import { Document } from "@langchain/core/documents";
import { createPersistence, runPostgresMigrations } from "@board-game-rules-assistant/database";
import { RulebookService } from "../src/application/ingestion/rulebook-service";
import { AccessPolicyService } from "../src/application/access/access-policy-service";

test("postgres driver persists upload version chunks, listing and soft deletion", async () => {
  const base = new URL(process.env.DATABASE_URL ?? "postgres://board_game_rules:board_game_rules@localhost:5432/board_game_rules");
  const name = `board_game_rules_api_${crypto.randomUUID().replaceAll("-", "")}`;
  const admin = postgres(base.toString(), { max: 1, onnotice: () => {} });
  await admin.unsafe(`CREATE DATABASE ${name}`);
  const url = new URL(base); url.pathname = `/${name}`;
  const migrationClient = postgres(url.toString(), { max: 1, onnotice: () => {} });
  await runPostgresMigrations(migrationClient);
  await migrationClient.end();
  const embeddings = { async embedQuery() { return Array(3072).fill(0.1); }, async embedDocuments(texts: string[]) { return texts.map(() => Array(3072).fill(0.1)); } };
  const persistence = await createPersistence({ driver: "postgres", nodeEnv: "test", databaseUrl: url.toString(), embeddings, expectedDimensions: 3072 });
  try {
    await persistence.healthCheck();
    const actor = { kind: "user" as const, userId: crypto.randomUUID(), accountRole: "user" as const, planTier: "standard" as const };
    await persistence.identity.createUser({ id: actor.userId, email: "upload@example.com", displayName: "Uploader", accountRole: "user", planTier: "standard" });
    const service = new RulebookService(persistence.library, new AccessPolicyService(persistence.policies, persistence.library), {
      async ingestPdf(input) {
        await persistence.vectorStore.upsert([new Document({ pageContent: "Setup uses three cards", metadata: { ...input.metadata, documentChunkId: crypto.randomUUID() } })]);
        return { documentCount: 1, chunkCount: 1 };
      },
    }, { embeddingModel: "deterministic", embeddingDimensions: 3072 });
    const uploaded = await service.upload({ actor, filePath: "/missing/temporary.pdf", pdfName: "root.pdf", fileSize: 321, gameName: "Root" });
    assert.equal((await service.list(actor))[0]?.fileSize, 321);
    const chunks = await persistence.vectorStore.similaritySearch({ query: "setup", topK: 5, scope: { gameId: uploaded.gameId, userId: actor.userId } });
    assert.equal(chunks[0]?.metadata.documentVersion, uploaded.versionId);
    assert.equal(await service.delete(actor, uploaded.id), true);
    assert.equal((await persistence.vectorStore.similaritySearch({ query: "setup", topK: 5, scope: { gameId: uploaded.gameId, userId: actor.userId } })).length, 0);
  } finally {
    await persistence.close();
    await admin.unsafe(`DROP DATABASE ${name} WITH (FORCE)`);
    await admin.end();
  }
});
