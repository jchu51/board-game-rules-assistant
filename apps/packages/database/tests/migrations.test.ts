import assert from "node:assert/strict";
import test from "node:test";

import { runPostgresMigrations } from "../src/postgres/run-migrations.js";
import { createPostgresTestDatabase } from "./postgres-test-database.js";

const requiredTables = [
  "conversations", "document_chunks", "document_versions", "documents", "games",
  "guest_sessions", "message_citations", "messages", "tier_policies", "users",
];

test("migration creates vector extension and the complete constrained schema", async () => {
  const database = await createPostgresTestDatabase();
  try {
    assert.equal((await database.sql`select extname from pg_extension where extname = 'vector'`).length, 1);

    const tables = await database.sql<{ table_name: string }[]>`
      select table_name from information_schema.tables
      where table_schema = 'public' and table_type = 'BASE TABLE'
        and table_name = any(${requiredTables})
      order by table_name`;
    assert.deepEqual(tables.map(({ table_name }) => table_name), [...requiredTables].sort());

    const foreignKeys = await database.sql<{ conname: string; delete_action: string }[]>`
      select conname, confdeltype::text as delete_action
      from pg_constraint where contype = 'f' and connamespace = 'public'::regnamespace`;
    const foreignKeyActions = new Map(foreignKeys.map(({ conname, delete_action }) => [conname, delete_action]));
    assert.deepEqual([...foreignKeyActions.keys()].sort(), [
      "conversations_game_id_games_id_fk",
      "conversations_guest_session_id_guest_sessions_id_fk",
      "conversations_user_id_users_id_fk",
      "document_chunks_document_version_id_document_versions_id_fk",
      "document_versions_document_id_documents_id_fk",
      "documents_game_id_games_id_fk",
      "documents_owner_id_users_id_fk",
      "message_citations_document_chunk_id_document_chunks_id_fk",
      "message_citations_message_id_messages_id_fk",
      "messages_conversation_id_conversations_id_fk",
    ]);
    for (const name of [
      "message_citations_message_id_messages_id_fk",
      "message_citations_document_chunk_id_document_chunks_id_fk",
      "messages_conversation_id_conversations_id_fk",
      "conversations_guest_session_id_guest_sessions_id_fk",
      "document_chunks_document_version_id_document_versions_id_fk",
    ]) assert.equal(foreignKeyActions.get(name), "c", `${name} must cascade on delete`);

    const checks = await database.sql<{ conname: string }[]>`
      select conname from pg_constraint where contype = 'c' and conname in
        ('documents_visibility_owner_check', 'conversations_actor_xor_check')`;
    assert.deepEqual(checks.map(({ conname }) => conname).sort(), ["conversations_actor_xor_check", "documents_visibility_owner_check"]);

    const indexes = await database.sql<{ indexname: string; indexdef: string }[]>`
      select indexname, indexdef from pg_indexes where schemaname = 'public'`;
    const indexDefinitions = new Map(indexes.map(({ indexname, indexdef }) => [indexname, indexdef]));
    assert.match(indexDefinitions.get("document_versions_active_unique") ?? "", /UNIQUE.*WHERE.*activated_at.*status/s);
    assert.match(indexDefinitions.get("document_versions_published_unique") ?? "", /UNIQUE.*WHERE.*status.*published/s);
    assert.equal(indexes.some(({ indexdef }) => /USING (hnsw|ivfflat)/i.test(indexdef)), false);

    const [embedding] = await database.sql<{ formatted_type: string }[]>`
      select format_type(a.atttypid, a.atttypmod) as formatted_type
      from pg_attribute a where a.attrelid = 'document_chunks'::regclass and a.attname = 'embedding'`;
    assert.equal(embedding?.formatted_type, "vector(3072)");

    const user = crypto.randomUUID();
    const game = crypto.randomUUID();
    await database.sql`insert into users (id, email, display_name) values (${user}, ${`${user}@example.com`}, 'Test')`;
    await database.sql`insert into games (id, name, slug) values (${game}, 'Test', ${game})`;
    await assert.rejects(database.sql`insert into documents (game_id, owner_id, visibility, kind, title) values (${game}, ${user}, 'global', 'other', 'invalid')`);
    await assert.rejects(database.sql`insert into conversations (game_id, title) values (${game}, 'invalid')`);
    await assert.rejects(database.sql`insert into conversations (game_id, user_id, guest_session_id, title) values (${game}, ${user}, ${crypto.randomUUID()}, 'invalid')`);

    const activeDocument = crypto.randomUUID();
    await database.sql`insert into documents (id, game_id, owner_id, visibility, kind, title) values (${activeDocument}, ${game}, ${user}, 'private', 'other', 'active')`;
    await database.sql`insert into document_versions (document_id, version_number, status, checksum, embedding_provider, embedding_model, embedding_dimensions, activated_at) values (${activeDocument}, 1, 'ready', 'one', 'openai', 'text-embedding-3-large', 3072, now())`;
    await assert.rejects(database.sql`insert into document_versions (document_id, version_number, status, checksum, embedding_provider, embedding_model, embedding_dimensions, activated_at) values (${activeDocument}, 2, 'ready', 'two', 'openai', 'text-embedding-3-large', 3072, now())`);

    const publishedDocument = crypto.randomUUID();
    await database.sql`insert into documents (id, game_id, visibility, kind, title) values (${publishedDocument}, ${game}, 'global', 'other', 'published')`;
    await database.sql`insert into document_versions (document_id, version_number, status, checksum, embedding_provider, embedding_model, embedding_dimensions) values (${publishedDocument}, 1, 'published', 'one', 'openai', 'text-embedding-3-large', 3072)`;
    await assert.rejects(database.sql`insert into document_versions (document_id, version_number, status, checksum, embedding_provider, embedding_model, embedding_dimensions) values (${publishedDocument}, 2, 'published', 'two', 'openai', 'text-embedding-3-large', 3072)`);
  } finally {
    await database.dispose();
  }
});

test("migration seeds every policy field and is idempotent", async () => {
  const database = await createPostgresTestDatabase();
  try {
    await runPostgresMigrations(database.sql);
    await runPostgresMigrations(database.sql);
    const policies = await database.sql`
      select tier, retrieval_top_k, private_upload_limit, conversation_ttl_days
      from tier_policies order by retrieval_top_k`;
    assert.deepEqual(Array.from(policies), [
      { tier: "guest", retrieval_top_k: 3, private_upload_limit: 0, conversation_ttl_days: 7 },
      { tier: "standard", retrieval_top_k: 5, private_upload_limit: 3, conversation_ttl_days: null },
      { tier: "pro", retrieval_top_k: 8, private_upload_limit: null, conversation_ttl_days: null },
    ]);
  } finally {
    await database.dispose();
  }
});
