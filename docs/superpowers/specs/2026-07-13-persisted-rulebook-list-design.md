# Persisted Rulebook List Design

## Goal

Change `GET /rulebooks` to list rulebook metadata from the selected
`RulebookRepository`, including PostgreSQL records that survive API restarts.

## Scope

This phase changes listing only. It does not add PDF retrieval, change deletion,
delete vectors, or modify the Library UI and response schema.

## Repository Contract

Change `RulebookRepository.list()` to return
`Promise<RulebookRecord[]>`. The in-memory implementation returns its current
records through the asynchronous contract. The PostgreSQL implementation reads
persisted metadata from the `rulebooks` table.

The PostgreSQL query selects only `id`, `game_name`, `pdf_name`, and
`file_size`. It must not select `pdf_data` or `mime_type`, because the existing
list response does not expose them and loading PDF bytes would make listing
unnecessarily expensive.

Results are ordered by `created_at DESC, id DESC`, providing deterministic
newest-first ordering.

## HTTP Flow

The existing `GET /rulebooks` route awaits `rulebookRepository.list()`, validates
the unchanged response with `ListRulebooksResponseSchema`, and returns HTTP 200.
Repository errors are passed to the existing Express error middleware with
`next(error)`.

The response remains:

```json
{
  "rulebooks": [
    {
      "id": "11111111-1111-4111-8111-111111111111",
      "gameName": "Catan",
      "pdfName": "catan.pdf",
      "fileSize": 1840000
    }
  ]
}
```

## Testing

- The PostgreSQL repository test verifies the metadata-only query, row mapping,
  and newest-first ordering clause.
- The in-memory repository test verifies the asynchronous list contract.
- Router tests verify successful asynchronous listing and error forwarding.
- Schema, full test, typecheck, build, lint, formatting, and database suites
  remain green.
