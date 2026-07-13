# Retrieval Conversation Metadata Design

## Goal

Make `POST /retrieval/search` generate and persist a useful conversation title and board-game name from user questions. Return the persisted title with the retrieval answer, retain unresolved games for later inference, and simplify the web chat navigation to a flat list.

## Metadata Lifecycle

The first question in a conversation triggers metadata generation. A focused metadata agent receives the question and returns a concise title plus a game name when it can identify one.

The generated title replaces the default `New chat` title and remains unchanged for the rest of the conversation. Later questions do not regenerate it.

The `conversations.game` column is nullable and defaults to `NULL`. If the first question does not identify a game, later searches retry game inference while the stored value is `NULL` or the case-insensitive legacy value `Unknown`. Once a concrete game is stored, later searches preserve it and do not invoke metadata inference again.

## Components and Responsibilities

### Conversation metadata agent

A focused agent accepts a question and returns structured conversation metadata. Its output contains a non-empty concise title and a nullable game. Invalid, empty, or failed output is treated as unresolved metadata rather than a retrieval failure.

### Retrieval service

Before completing a turn, the retrieval service reads the conversation detail and messages to determine whether it is the first question and whether game inference is still required. It invokes metadata generation only when required, preserves an established title or game, and persists the resulting metadata with the completed turn.

Every successful retrieval result contains the current persisted title. Metadata inference failures do not prevent answer generation or message persistence.

### Conversation repositories

The repository contract gains a metadata update operation and exposes nullable game values in conversation summaries and details. The in-memory and Postgres implementations follow identical metadata lifecycle behavior.

A new additive database migration adds `game TEXT NULL` to `conversations`. Existing records remain `NULL`; no display placeholder is stored.

### HTTP contracts

`POST /retrieval/search` returns exactly these top-level properties:

```json
{
  "title": "Catan city production",
  "answer": "A city produces two resources.",
  "matches": []
}
```

The response does not include `game`. The title is always non-empty, falling back to the conversation's existing title if metadata generation fails.

Chat list and detail responses add `game`, typed as `string | null`, so clients can retrieve persisted game metadata. OpenAPI, runtime schemas, and TypeScript response types remain aligned.

### Web chat

The web client stops deriving authoritative title and game metadata from its local hard-coded game detector. After a successful retrieval, it uses the returned title and refreshes the chat detail to obtain the persisted nullable game. A `null` game is displayed as `Unknown`.

Chat navigation remains searchable by title and game but no longer groups conversations by game. It removes the `gameGroups` and `ungrouped` controller projections and renders all filtered conversations directly in one flat navigation section without a group heading.

## Data Flow

1. The web client sends `conversationId` and `query` to `POST /retrieval/search`.
2. The retrieval service loads the conversation and recent messages.
3. On the first question, the metadata agent proposes title and game. On later questions, it runs only if game remains unresolved and then proposes only a game update while the title is preserved.
4. Retrieval produces the rule answer and matches using the existing internal-first and public-fallback flow.
5. The repository persists any eligible metadata update and the user/assistant messages.
6. The endpoint returns `title`, `answer`, and `matches`.
7. The web client updates the displayed title and refreshes chat detail for the persisted game.

## Failure and Compatibility Behavior

- Metadata generation is best-effort. Model errors, malformed output, or an empty title/game do not fail retrieval.
- On first-question metadata failure, the existing non-empty title is retained and game remains `NULL`.
- On later game-inference failure, the original title and unresolved game remain unchanged.
- Existing `Unknown` database values are treated as unresolved for compatibility, but new unresolved values are stored as `NULL`.
- The existing answer and match behavior of retrieval is unchanged apart from the additive `title` response property.

## Testing

Automated tests cover:

- first-question title and game generation;
- title preservation on all follow-up questions;
- game retry from `NULL` and case-insensitive legacy `Unknown`;
- no metadata invocation after a concrete game is stored;
- malformed and failed metadata generation fallback;
- in-memory and Postgres metadata persistence;
- the additive nullable database migration;
- retrieval, chat, OpenAPI, and client response contracts;
- frontend title/game synchronization after retrieval;
- rendering unresolved game as `Unknown`; and
- flat, searchable chat navigation without groups or headings.

