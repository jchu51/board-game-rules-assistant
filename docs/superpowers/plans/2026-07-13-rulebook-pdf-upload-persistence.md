# Rulebook PDF Upload Persistence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist every successfully embedded uploaded PDF and its metadata so PostgreSQL contains a byte-for-byte copy before the upload response succeeds.

**Architecture:** Add a `rulebooks` migration and rulebook file store to the database package. The API persistence bundle supplies either the PostgreSQL store or an in-memory equivalent, and the upload router saves the temporary file after ingestion but before creating its existing process-local list record.

**Tech Stack:** TypeScript, Express, Multer, PostgreSQL `BYTEA`, `pg`, Vitest.

## Global Constraints

- Implement upload persistence only.
- Do not change `GET /rulebooks`, `DELETE /rulebooks/:id`, the Library UI, or vector deletion.
- Keep the existing multipart request and JSON response unchanged.
- Store the PDF after embedding succeeds and always remove its temporary file.
- Continue supporting `PERSISTENCE_DRIVER=memory`.

---

### Task 1: Add the Rulebook Table

**Files:**
- Create: `apps/packages/database/migrations/0003_rulebooks.sql`
- Modify: `apps/packages/database/src/migrations.ts`
- Modify: `apps/packages/database/tests/migrations.test.ts`

**Interfaces:**
- Produces: `rulebooks(id, game_name, pdf_name, mime_type, file_size, pdf_data, created_at)`.

- [ ] **Step 1: Write the failing migration test**

Add `{ version: "0003_rulebooks" }` to the expected migrations. Query `information_schema.columns` and expect non-null `uuid`, `text`, `integer`, `bytea`, and `timestamp with time zone` columns matching the approved design.

- [ ] **Step 2: Verify RED**

Run `TEST_DATABASE_URL=postgresql://board_game_rules:board_game_rules@127.0.0.1:55432/board_game_rules npm test -w @board-game-rules-assistant/database -- tests/migrations.test.ts`.

Expected: FAIL because migration 0003 and the table do not exist.

- [ ] **Step 3: Implement the migration**

```sql
CREATE TABLE IF NOT EXISTS rulebooks (
  id UUID PRIMARY KEY,
  game_name TEXT NOT NULL,
  pdf_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size INTEGER NOT NULL CHECK (file_size >= 0),
  pdf_data BYTEA NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Append `"0003_rulebooks"` to `migrationVersions`.

- [ ] **Step 4: Verify GREEN and commit**

Rerun Step 2, then commit with `feat(database): add persisted rulebooks table`.

### Task 2: Add PostgreSQL and Memory File Stores

**Files:**
- Create: `apps/packages/database/src/rulebook/rulebook-file-store.ts`
- Modify: `apps/packages/database/src/persistence.ts`
- Modify: `apps/packages/database/src/index.ts`
- Create: `apps/packages/database/tests/rulebook-file-store.test.ts`
- Create: `apps/api/src/infrastructure/persistence/rulebook/in-memory-rulebook-file-store.ts`
- Create: `apps/api/tests/rulebook-file-store.test.ts`

**Interfaces:**
- Produces: `RulebookFileRecord` containing `id`, `gameName`, `pdfName`, `mimeType`, `fileSize`, and `pdfData: Uint8Array`.
- Produces: `RulebookFileStore.save(record: RulebookFileRecord): Promise<void>`.
- Produces: `PostgresRulebookFileStore` and `InMemoryRulebookFileStore`.

- [ ] **Step 1: Write a failing PostgreSQL byte-persistence test**

Initialize database persistence, save this record, query `rulebooks` directly, and expect byte-for-byte equality:

```ts
const pdfData = Uint8Array.from([0x25, 0x50, 0x44, 0x46, 0x2d]);
await persistence.rulebookFileStore.save({
  id: "11111111-1111-4111-8111-111111111111",
  gameName: "Catan",
  pdfName: "catan.pdf",
  mimeType: "application/pdf",
  fileSize: pdfData.byteLength,
  pdfData,
});
```

- [ ] **Step 2: Verify PostgreSQL RED**

Run `TEST_DATABASE_URL=postgresql://board_game_rules:board_game_rules@127.0.0.1:55432/board_game_rules npm test -w @board-game-rules-assistant/database -- tests/rulebook-file-store.test.ts`.

Expected: FAIL because `rulebookFileStore` is absent.

- [ ] **Step 3: Implement the PostgreSQL store**

Define the record and store interface, then implement:

```ts
async save(record: RulebookFileRecord): Promise<void> {
  await this.pool.query(
    `INSERT INTO rulebooks
       (id, game_name, pdf_name, mime_type, file_size, pdf_data)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [record.id, record.gameName, record.pdfName, record.mimeType,
     record.fileSize, Buffer.from(record.pdfData)],
  );
}
```

Expose a `rulebookFileStore` constructed with the shared pool from `PostgresPersistence` and export its public types.

- [ ] **Step 4: Verify PostgreSQL GREEN**

Rerun Step 2 and expect PASS.

- [ ] **Step 5: Write and verify a failing memory-store ownership test**

Save a record, mutate the caller's byte array, and expect a test-only `get(id)` to retain the original bytes. Mutate the returned bytes and verify a second `get(id)` remains unchanged. Run `npm test -w api -- tests/rulebook-file-store.test.ts`; expect an import failure.

- [ ] **Step 6: Implement and verify the memory store**

Use a `Map`, copying bytes on save and get:

```ts
async save(record: RulebookFileRecord): Promise<void> {
  this.records.set(record.id, { ...record, pdfData: record.pdfData.slice() });
}

get(id: string): RulebookFileRecord | undefined {
  const record = this.records.get(id);
  return record ? { ...record, pdfData: record.pdfData.slice() } : undefined;
}
```

Rerun both focused store tests and commit with `feat: add rulebook pdf file stores`.

### Task 3: Persist Through POST /rulebooks

**Files:**
- Modify: `apps/api/src/infrastructure/persistence/create-persistence.ts`
- Modify: `apps/api/tests/create-persistence.test.ts`
- Modify: `apps/api/src/presentation/http/ingestion/ingestion-router.ts`
- Modify: `apps/api/tests/http-routers.test.ts`
- Modify: `apps/api/src/main.ts`

**Interfaces:**
- Consumes: `RulebookFileStore.save(record)` from Task 2.
- Produces: uploads that save PDF bytes before returning success.

- [ ] **Step 1: Write and verify a failing persistence-bundle test**

Use `persistence.rulebookFileStore.save(...)` in the memory persistence test. Run `npm test -w api -- tests/create-persistence.test.ts`; expect a missing-property failure.

- [ ] **Step 2: Wire the persistence bundle**

Add `rulebookFileStore: RulebookFileStore` to `Persistence`. Return `InMemoryRulebookFileStore` in memory mode and `postgresPersistence.rulebookFileStore` in PostgreSQL mode. Rerun Step 1 and expect PASS.

- [ ] **Step 3: Write failing upload tests**

Inject a mocked `RulebookFileStore`, create a real temporary file containing known bytes, and expect:

```ts
expect(rulebookFileStore.save).toHaveBeenCalledWith({
  id: expect.any(String),
  gameName: "Catan",
  pdfName: "catan.pdf",
  mimeType: "application/pdf",
  fileSize: pdfBytes.byteLength,
  pdfData: pdfBytes,
});
```

Assert ingestion runs before save. Add an ingestion-failure case proving save is not called and the process-local metadata repository stays empty.

- [ ] **Step 4: Verify upload RED**

Run `npm test -w api -- tests/http-routers.test.ts`.

Expected: FAIL because the router neither accepts the store nor reads the file.

- [ ] **Step 5: Implement upload persistence**

Import `readFile` beside `rm`. Inject the store and, after `ingestPdf` resolves, execute:

```ts
const pdfData = await readFile(request.file.path);
await this.rulebookFileStore.save({
  id,
  gameName,
  pdfName,
  mimeType: request.file.mimetype,
  fileSize,
  pdfData,
});
```

Create the existing metadata record only after save succeeds. Pass `persistence.rulebookFileStore` from `main.ts`.

- [ ] **Step 6: Verify GREEN and commit**

Run `npm test -w api -- tests/create-persistence.test.ts tests/http-routers.test.ts tests/rulebook-file-store.test.ts`. Expect PASS, then commit with `feat(api): persist uploaded rulebook pdfs`.

### Task 4: Document and Verify Phase One

**Files:**
- Modify: `apps/api/openapi.yml`
- Modify: `apps/api/README.md`
- Modify: `apps/packages/database/README.md`

**Interfaces:**
- Produces: documentation that distinguishes persisted upload storage from process-local list/delete behavior.

- [ ] **Step 1: Update documentation**

Describe `POST /rulebooks` as extracting, indexing, and persisting the original PDF under PostgreSQL. Keep list/delete documented as process-local. Document the `rulebooks` table and 40 MB `BYTEA` choice.

- [ ] **Step 2: Run full verification**

Run `npm test`, `npm run typecheck`, `npm run build`, `npm run lint -w api`, the database test suite with `TEST_DATABASE_URL`, and `git diff --check`. All must pass.

- [ ] **Step 3: Format and reverify**

Run `npm run format`, restore unrelated formatter noise, rerun focused tests, and run `git diff --check`.

- [ ] **Step 4: Commit and stop**

Commit documentation with `docs: describe persisted rulebook uploads`. Report the migration, behavior, tests, and a read-only SQL inspection query. Do not begin the list or PDF GET phases until the user confirms the uploaded row.
