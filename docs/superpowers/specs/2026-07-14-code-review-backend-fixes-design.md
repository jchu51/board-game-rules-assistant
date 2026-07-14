# Backend Integrity Fixes Design

## Scope

Address code-review findings 1, 2, 6, and 8 without changing unrelated API behavior:

- reject retrieval for conversations that do not exist;
- keep stored rulebooks and their vector chunks consistent during upload and deletion;
- distinguish process liveness from dependency readiness;
- return rulebooks newest-first in both persistence drivers.

## Conversation integrity

`POST /retrieval/search` will require its `conversationId` to identify an existing conversation. The retrieval service will throw a typed not-found error before classification, embedding search, title generation, or message persistence. HTTP handling will translate that error to a `404` response.

A migration will change `conversation_messages.conversation_id` from unconstrained text to UUID and add a foreign key to `conversations(id)` with `ON DELETE CASCADE`. The migration must preserve valid existing messages and fail visibly if orphaned data already exists rather than silently deleting user data.

## Rulebook and vector lifecycle

Every ingested chunk already carries `documentId`; that value will be the deletion key. `VectorStore` will gain `deleteByDocumentId(documentId: string): Promise<void>`, implemented by both memory and PostgreSQL adapters.

Upload remains vector-first because PDF parsing and embedding happen as one ingestion operation. If rulebook persistence fails afterward, the upload handler will compensate by deleting all vectors for that document ID before propagating the original error. If compensation also fails, both failures will remain observable instead of reporting success.

Rulebook deletion will remove vectors before deleting the stored PDF record. If the rulebook does not exist, no vector deletion occurs and the endpoint returns `404`. This ordering avoids deleting the discoverable record while stale vectors remain searchable. A vector deletion failure leaves the rulebook record intact so the operation can be retried.

## Health endpoints

`GET /health` remains a dependency-free liveness endpoint. A new `GET /ready` endpoint will call the configured persistence health check and return `200` only when required persistence components are usable. Dependency failure will return `503` through explicit readiness handling rather than the generic `500` middleware.

The API Docker health check will use `/ready`. The health router will receive the readiness dependency through constructor injection so it can be tested without a real database.

## Rulebook ordering

The in-memory repository will record creation order and return newest entries first, matching the PostgreSQL repository and the documented API contract. Re-saving the same ID will replace the record and make it the newest entry, matching a new successful save operation.

## Testing

Each behavior will be introduced through a failing regression test before production changes:

- retrieval rejects an unknown conversation without side effects;
- database constraints reject orphan messages and cascade conversation deletion;
- both vector adapters delete only chunks with the requested document ID;
- failed rulebook persistence compensates vector ingestion;
- rulebook deletion coordinates vector and relational persistence in retry-safe order;
- readiness reports healthy and unavailable dependencies correctly;
- in-memory rulebook ordering matches PostgreSQL ordering.

After targeted tests pass, run the complete test suite against PostgreSQL, TypeScript type-checking, API and web linting, builds, Docker Compose validation, and the repository formatter.
