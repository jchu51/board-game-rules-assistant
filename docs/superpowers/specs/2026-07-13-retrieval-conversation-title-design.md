# Retrieval Conversation Title Design

## Goal

Generate and persist a concise conversation title from the first question sent to `POST /retrieval/search`, return that title with the retrieval result, and render chat navigation as one flat list.

## Title Lifecycle

A focused title agent receives the first question in a conversation and returns a validated non-empty title. The retrieval service persists that title and returns it with the answer. Follow-up questions preserve the stored title and do not invoke the title agent again.

Title generation is best-effort. If the model fails or returns invalid output, retrieval and message persistence continue with the conversation's existing title.

## API Contract

`POST /retrieval/search` returns exactly these top-level properties:

```json
{
  "title": "Catan city production",
  "answer": "A city produces two resources.",
  "matches": []
}
```

Chat list and detail contracts remain unchanged.

## Persistence

The conversation repository exposes `updateTitle(conversationId, title)`. Both in-memory and PostgreSQL implementations update only the title and preserve existing conversation/message behavior. No database migration is required.

## Web Chat

The web client uses the title returned by retrieval instead of deriving a title locally. Existing client-local board-game detection remains unchanged and is not persisted by this feature.

Chat navigation remains searchable but no longer groups conversations. It renders all filtered conversations directly in one flat section without a group heading.

## Testing

Automated tests cover title-agent validation, first-question generation, follow-up preservation, failure fallback, repository title updates, exact retrieval response shape, frontend title synchronization, and flat navigation.
