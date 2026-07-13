# Rulebook PDF Upload Persistence Design

## Goal

Persist an uploaded rulebook PDF and its metadata in PostgreSQL after its text
has been embedded successfully. This phase changes only the upload path so the
stored data can be inspected before list, download, and Library display work is
started.

## Scope

This phase includes:

- A PostgreSQL `rulebooks` table containing the rulebook metadata and complete
  PDF bytes.
- A storage contract with PostgreSQL and in-memory implementations.
- Wiring the selected persistence implementation into `POST /rulebooks`.
- Saving the PDF only after embedding completes successfully.
- Upload and database integration tests.
- Updated upload API documentation.

This phase deliberately excludes:

- Reading rulebook metadata from PostgreSQL in `GET /rulebooks`.
- A PDF content endpoint such as `GET /rulebooks/:id/pdf`.
- Library-page links, preview dialogs, or embedded PDF display.
- Deleting vectors or persisted PDF rows through the existing delete endpoint.

Those capabilities will be implemented and checked as separate follow-up
phases.

## Data Model

Add a `rulebooks` table with:

- `id UUID PRIMARY KEY`
- `game_name TEXT NOT NULL`
- `pdf_name TEXT NOT NULL`
- `mime_type TEXT NOT NULL`
- `file_size INTEGER NOT NULL`
- `pdf_data BYTEA NOT NULL`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`

The API already limits uploads to 40 MB, so `BYTEA` is appropriate and avoids
the lifecycle complexity of PostgreSQL large objects. List operations in later
phases will select metadata columns only and will not load `pdf_data`.

## Components

Introduce a focused rulebook file-storage interface owned by the API domain.
Its phase-one operation accepts an immutable record containing the generated
rulebook id, game name, original filename, MIME type, file size, and PDF bytes.

The PostgreSQL implementation inserts the record into `rulebooks` using the
shared database pool. The in-memory implementation retains the same record in
a map so `PERSISTENCE_DRIVER=memory` keeps equivalent upload behavior for local
development and unit tests.

The existing in-memory rulebook metadata repository remains in place during
this phase because changing the list and delete endpoints is explicitly deferred.
After persistence succeeds, the upload handler continues adding the metadata
record there so current-process `GET /rulebooks` behavior does not regress.

## Upload Data Flow

1. Multer validates the upload and writes it to the configured temporary upload
   directory.
2. The ingestion service extracts, chunks, embeds, and indexes the PDF exactly
   as it does today.
3. The upload handler reads the unchanged temporary file into a `Buffer`.
4. The selected rulebook file storage saves metadata and bytes.
5. The existing process-local metadata record is created.
6. The API returns the existing `UploadPdfsResponse` without adding binary data.
7. The `finally` block removes the temporary file.

The generated rulebook id is shared by vector metadata, the persisted row, and
the upload response, allowing later endpoints to locate the exact PDF.

## Failure Handling

- Validation and embedding failures do not create a rulebook database row.
- A database insertion failure causes the upload request to fail and does not
  create the process-local metadata record.
- The temporary file is removed for both successful and failed requests.
- Vector storage and PostgreSQL cannot participate in one transaction. If
  embedding succeeds but database insertion fails, indexed chunks may remain.
  Vector deletion is an existing limitation and is outside this phase.
- Duplicate ids fail through the database primary-key constraint; ids are
  generated UUIDs, so this is defensive rather than an expected user error.

## API Contract

`POST /rulebooks` retains its current multipart request and JSON response:

- Request fields: `file`, `gameName`, and optional splitter parameters.
- Response fields: `id`, `gameName`, `pdfName`, `fileSize`, `status`,
  `documentCount`, and `chunkCount`.

The endpoint's documentation changes from describing an in-memory record to
stating that a successful upload persists the original PDF when PostgreSQL
persistence is selected.

## Testing

- Migration tests verify the `rulebooks` table, `BYTEA` column, and idempotent
  migration execution.
- Storage contract tests verify that all bytes and metadata are retained.
- PostgreSQL integration tests save a small PDF-like byte sequence and query the
  database directly to prove byte-for-byte persistence.
- Upload router tests prove storage is called after successful ingestion, is not
  called when ingestion fails, and receives the original bytes.
- Existing ingestion, list, delete, typecheck, build, lint, and database tests
  remain green.

## Follow-up Phases

1. Change `GET /rulebooks` to list persisted metadata without loading PDF bytes.
2. Add `GET /rulebooks/:id/pdf` with `application/pdf` and inline content
   disposition.
3. Add the Library-page action that opens or embeds the persisted rulebook.
4. Align deletion of database records and indexed vectors once vector deletion
   is supported.
