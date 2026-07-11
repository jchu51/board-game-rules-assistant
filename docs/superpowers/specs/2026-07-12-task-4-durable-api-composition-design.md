# Durable API Composition Design

## Goal

Make PostgreSQL-default local mode operational through upload, listing, deletion, retrieval history, startup health checking, and shutdown without any legacy in-memory repository remaining authoritative.

## Persistence extensions

Documents persist `fileSizeBytes` so the current HTTP response remains stable. The library repository gains idempotent game lookup by slug and owner-scoped document listing with game data. User creation accepts an optional stable ID so local startup can idempotently bootstrap one configured Standard user. PostgreSQL implements these operations with conflict-safe writes; memory implements the same contract.

## Actor boundary

An HTTP actor resolver accepts exactly one of `x-user-id` or `x-guest-session-id`, loads the corresponding persisted identity, and returns an `Actor`. In local mode only, absent headers resolve to the configured bootstrapped Standard user. Test mode has no silent actor unless explicitly supplied by a test composition. Development and production never fall back. Guests may retrieve but the upload/list/delete application boundary rejects guest actors.

## Ingestion lifecycle

An application service receives an actor and upload metadata. It slugifies and idempotently resolves the game, creates a private owned document and processing version, then passes actual game/document/version IDs into chunk metadata before vector upsert. On success it activates the private version with the chunk count. On failure it marks the version failed and rethrows. The router always deletes the temporary PDF. Listing and soft deletion use owner-scoped library repository operations.

## Conversation compatibility

Retrieval becomes async over the persisted conversation repository. For the existing public request shape, it first loads the requested conversation for the resolved actor. If absent, it creates that exact requested conversation ID for the supplied game; this requires optional IDs on conversation creation. Existing messages are loaded before classification, and user/assistant messages are appended after the answer. Citations remain empty in this compatibility step because durable citation mapping belongs to the later retrieval/citation task. The public `gameId` boundary remains explicit and ownership is checked before using history.

## Composition and verification

`main.ts` bootstraps the local user after persistence health succeeds and before listen, injects the persistent library/conversation/vector-store boundaries, and closes persistence after server shutdown. Configuration rejects memory in development and production. Tests cover both driver rules, actor rules, ingestion success/failure, persistent list/delete, conversations, and lifecycle ordering; a live PostgreSQL integration proves version/chunk metadata and soft deletion.
