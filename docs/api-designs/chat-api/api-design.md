# Chat API Design

## Overview

- **Protocol:** REST
- **Base path:** `/chats`
- **Auth:** None, matching the current API
- **Versioning strategy:** Unversioned, matching existing `/rulebooks` and `/retrieval` routes
- **Status:** APPROVED

## Resources and Endpoints

### `POST /chats`

Creates an empty chat with a server-generated UUID.

| Request field | Type | Required | Constraints |
|---|---|---:|---|
| `title` | string | No | Defaults to `New chat`; trimmed; 1–120 characters |
| `game` | string or null | No | Defaults to null; trimmed; 1–100 characters when supplied |

Response `201 Created`: `{ "chat": ChatSummary }`.

Errors: `400` with `{ "error": string }` for invalid input.

### `GET /chats`

Lists chat summaries in descending `updatedAt` order, with `id` as a stable tie-breaker. Messages are never included.

| Query field | Type | Required | Constraints |
|---|---|---:|---|
| `limit` | integer | No | Defaults to 20; minimum 1; maximum 100 |
| `cursor` | string | No | Opaque cursor returned by a previous request |

Response `200 OK`:

```json
{
  "chats": [],
  "nextCursor": null
}
```

`nextCursor` is a string when more results exist and null otherwise. Invalid or malformed cursors return `400`.

### `GET /chats/:id`

Returns one chat summary and a bounded page of messages in ascending creation order.

| Parameter | Type | Required | Constraints |
|---|---|---:|---|
| `id` | UUID | Yes | Chat identifier |
| `limit` | integer | No | Defaults to 50; minimum 1; maximum 100 |
| `cursor` | string | No | Opaque message cursor returned by this endpoint |

Response `200 OK`:

```json
{
  "chat": {},
  "messages": [],
  "nextCursor": null
}
```

Unknown chats return `404` with `{ "error": "Chat not found" }`. Invalid IDs, limits, or cursors return `400`.

### `DELETE /chats/:id`

Deletes the chat and all associated messages atomically.

Response `204 No Content`. Unknown chats return `404` with `{ "error": "Chat not found" }`. Invalid UUIDs return `400`.

## Schemas

### ChatSummary

| Field | Type | Required | Description |
|---|---|---:|---|
| `id` | UUID string | Yes | Server-generated chat identifier |
| `title` | string | Yes | Display title |
| `game` | string or null | Yes | Associated board game, when known |
| `messageCount` | non-negative integer | Yes | Number of retained messages |
| `createdAt` | ISO-8601 string | Yes | Creation timestamp |
| `updatedAt` | ISO-8601 string | Yes | Last metadata or message update |

### ChatMessage

| Field | Type | Required | Description |
|---|---|---:|---|
| `id` | positive integer | Yes | Stable message identifier |
| `role` | `user` or `assistant` | Yes | Message author role |
| `content` | string | Yes | Message text |
| `createdAt` | ISO-8601 string | Yes | Message creation timestamp |

## Error Contract

Errors retain the current API envelope:

```json
{ "error": "Human-readable description" }
```

| Status | Condition |
|---:|---|
| 400 | Invalid body, path parameter, limit, or cursor |
| 404 | Chat does not exist |
| 500 | Unexpected persistence or server failure |

## Pagination

Cursors are opaque URL-safe Base64 values. Chat cursors encode the `updatedAt` and `id` position; message cursors encode the last message ID. Implementations fetch `limit + 1` records, return at most `limit`, and emit a cursor only when an additional record exists. Consumers must not parse or construct cursors.

## Persistence and Compatibility

- Add a `conversations` table with `id`, `title`, nullable `game`, `created_at`, and `updated_at`.
- `conversation_messages.conversation_id` references `conversations.id` with cascade deletion.
- Existing message rows are backfilled into default chat records during migration.
- `appendMessages` creates a default `New chat` record when an unknown conversation ID arrives. This preserves compatibility with existing retrieval clients that currently generate conversation IDs.
- Appending messages updates the chat's `updated_at` timestamp.
- Both in-memory and Postgres repositories implement identical lifecycle and pagination behavior.

## Versioning

The current API is unversioned. These endpoints follow that convention. Breaking changes require introducing a versioned base path; additive optional fields may be added without a new version.

## OpenAPI 3.2 Stub

```yaml
openapi: 3.2.0
info:
  title: Board Game Rules Assistant Chat API
  version: 1.0.0
paths:
  /chats:
    post:
      summary: Create a chat
      requestBody:
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/CreateChatRequest"
      responses:
        "201":
          description: Created
    get:
      summary: List chat summaries
      parameters:
        - { name: limit, in: query, schema: { type: integer, minimum: 1, maximum: 100, default: 20 } }
        - { name: cursor, in: query, schema: { type: string } }
      responses:
        "200":
          description: Chat summary page
  /chats/{id}:
    get:
      summary: Get a chat and a page of messages
      parameters:
        - { name: id, in: path, required: true, schema: { type: string, format: uuid } }
        - { name: limit, in: query, schema: { type: integer, minimum: 1, maximum: 100, default: 50 } }
        - { name: cursor, in: query, schema: { type: string } }
      responses:
        "200":
          description: Chat detail
        "404":
          description: Chat not found
    delete:
      summary: Delete a chat
      parameters:
        - { name: id, in: path, required: true, schema: { type: string, format: uuid } }
      responses:
        "204":
          description: Deleted
        "404":
          description: Chat not found
components:
  schemas:
    CreateChatRequest:
      type: object
      properties:
        title: { type: string, minLength: 1, maxLength: 120, default: New chat }
        game: { type: [string, "null"], minLength: 1, maxLength: 100 }
      additionalProperties: false
    ChatSummary:
      type: object
      required: [id, title, game, messageCount, createdAt, updatedAt]
      properties:
        id: { type: string, format: uuid }
        title: { type: string }
        game: { type: [string, "null"] }
        messageCount: { type: integer, minimum: 0 }
        createdAt: { type: string, format: date-time }
        updatedAt: { type: string, format: date-time }
```

## Consumer Impact

| Consumer | Impact | Action |
|---|---|---|
| Web chat page | Can replace local-only chat creation/history/deletion with these endpoints | Integrate in a separate frontend task |
| Retrieval API | Continues accepting client-generated conversation IDs | No immediate consumer change |

## Open Questions

None blocking implementation.
