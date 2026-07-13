# Persisted Rulebook Delete Design

## Goal

Change `DELETE /rulebooks/:id` to delete the persisted rulebook row and PDF from
the selected `RulebookRepository`.

## Scope

This phase changes rulebook deletion and removes the transitional in-memory
delegate from `PostgresRulebookRepository`. It does not delete vector chunks,
add PDF retrieval, or modify frontend behavior.

## Repository Contract

Change `RulebookRepository.deleteById(id)` to return `Promise<boolean>`.

The PostgreSQL implementation executes:

```sql
DELETE FROM rulebooks
WHERE id = $1
```

It returns `true` only when `rowCount` is `1`. Because PDF bytes are stored in
the same row, deleting the row also deletes the PDF without a second operation.

The in-memory implementation exposes the same asynchronous contract. The
PostgreSQL implementation removes its `InMemoryRulebookRepository` delegate;
`save`, `list`, and `deleteById` then operate exclusively on PostgreSQL.

## HTTP Flow

The existing route awaits repository deletion:

- Deleted row: HTTP 204 with no response body.
- Missing row: HTTP 404 with `{ "error": "Rulebook not found" }`.
- Repository failure: passed to the existing Express error middleware.

The route path and response contract remain unchanged.

## Consistency Limitation

The current vector-store contract cannot delete chunks by rulebook id. Deleting
a rulebook removes its metadata and PDF but leaves indexed vectors until vector
deletion is implemented as a separate phase.

## Testing

- PostgreSQL repository tests verify the parameterized delete and `rowCount`
  result mapping.
- In-memory repository tests verify the asynchronous delete contract.
- Router tests verify 204, 404, and error forwarding.
- Full tests, typecheck, build, lint, formatting, and database suites remain
  green.
