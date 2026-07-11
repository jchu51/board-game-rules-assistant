import { and, asc, count, eq, isNull, or, sql } from "drizzle-orm";

import { PersistenceNotFoundError } from "../domain/errors.js";
import type {
  ConversationRepository,
  IdentityRepository,
  LibraryRepository,
  PolicyRepository,
} from "../domain/repositories.js";
import type { PostgresDatabase } from "./client.js";
import {
  conversations,
  documentVersions,
  documents,
  games,
  guestSessions,
  messageCitations,
  messages,
  tierPolicies,
  users,
} from "./schema.js";

const firstOrThrow = <T>(rows: T[], resource: string): T => {
  const row = rows[0];
  if (!row) throw new PersistenceNotFoundError(resource);
  return row;
};

export const createPostgresRepositories = (db: PostgresDatabase): {
  identity: IdentityRepository;
  policies: PolicyRepository;
  library: LibraryRepository;
  conversations: ConversationRepository;
} => {
  const ownedConversationWhere = (
    actor: Parameters<ConversationRepository["getOwnedConversation"]>[0]["actor"],
    conversationId: string,
  ) =>
    actor.kind === "user"
      ? and(eq(conversations.id, conversationId), eq(conversations.userId, actor.userId))
      : and(
          eq(conversations.id, conversationId),
          eq(conversations.guestSessionId, actor.guestSessionId),
        );

  const identity: IdentityRepository = {
    async createUser(input) {
      return firstOrThrow(await db.insert(users).values(input).returning(), "user");
    },
    async getUserById({ id }) {
      return (await db.select().from(users).where(eq(users.id, id)).limit(1))[0] ?? null;
    },
    async createGuestSession(input) {
      return firstOrThrow(
        await db.insert(guestSessions).values(input).returning(),
        "guest session",
      );
    },
    async getGuestSession({ id }) {
      return (
        await db.select().from(guestSessions).where(eq(guestSessions.id, id)).limit(1)
      )[0] ?? null;
    },
  };

  const policies: PolicyRepository = {
    async getTierPolicy(tier) {
      const row = (
        await db
          .select({
            tier: tierPolicies.tier,
            retrievalTopK: tierPolicies.retrievalTopK,
            privateUploadLimit: tierPolicies.privateUploadLimit,
            conversationTtlDays: tierPolicies.conversationTtlDays,
          })
          .from(tierPolicies)
          .where(eq(tierPolicies.tier, tier))
          .limit(1)
      )[0];
      if (!row) throw new PersistenceNotFoundError("tier policy");
      return row;
    },
  };

  const library: LibraryRepository = {
    async createGame(input) {
      return firstOrThrow(await db.insert(games).values(input).returning(), "game");
    },
    async getGameById({ id }) {
      return (await db.select().from(games).where(eq(games.id, id)).limit(1))[0] ?? null;
    },
    async resolveGame(input) {
      const inserted = await db
        .insert(games)
        .values(input)
        .onConflictDoNothing({ target: games.slug })
        .returning();
      return inserted[0] ?? firstOrThrow(
        await db.select().from(games).where(eq(games.slug, input.slug)).limit(1),
        "game",
      );
    },
    async createDocument(input) {
      return firstOrThrow(
        await db.insert(documents).values({ ...input, ownerId: input.ownerId ?? null, fileSizeBytes: input.fileSizeBytes ?? 0 }).returning(),
        "document",
      );
    },
    async createPrivateDocumentWithinLimit(input) {
      return db.transaction(async (tx) => {
        await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${input.ownerId}, 0))`);
        const currentUsage = firstOrThrow(
          await tx.select({ value: count() }).from(documents).where(and(
            eq(documents.ownerId, input.ownerId), eq(documents.visibility, "private"), isNull(documents.deletedAt),
          )),
          "document count",
        ).value;
        if (input.limit !== null && currentUsage >= input.limit) return { document: null, currentUsage };
        const document = firstOrThrow(await tx.insert(documents).values({
          gameId: input.gameId, ownerId: input.ownerId, visibility: "private",
          kind: input.kind, title: input.title, fileSizeBytes: input.fileSizeBytes ?? 0,
        }).returning(), "document");
        return { document, currentUsage };
      });
    },
    async getOwnedPrivateDocument({ documentId, ownerId }) {
      return (await db.select().from(documents).where(and(
        eq(documents.id, documentId), eq(documents.ownerId, ownerId),
        eq(documents.visibility, "private"), isNull(documents.deletedAt),
      )).limit(1))[0] ?? null;
    },
    async listOwnedDocuments({ ownerId }) {
      const rows = await db
        .select({ document: documents, game: games })
        .from(documents)
        .innerJoin(games, eq(documents.gameId, games.id))
        .where(and(eq(documents.ownerId, ownerId), isNull(documents.deletedAt)));
      return rows;
    },
    async countActivePrivateDocuments({ ownerId }) {
      const row = firstOrThrow(
        await db
          .select({ value: count() })
          .from(documents)
          .where(
            and(
              eq(documents.ownerId, ownerId),
              eq(documents.visibility, "private"),
              isNull(documents.deletedAt),
            ),
          ),
        "document count",
      );
      return row.value;
    },
    async listRetrievableDocuments({ gameId, userId }) {
      const visibility = userId
        ? or(eq(documents.visibility, "global"), eq(documents.ownerId, userId))
        : eq(documents.visibility, "global");
      return db
        .select()
        .from(documents)
        .where(and(eq(documents.gameId, gameId), isNull(documents.deletedAt), visibility));
    },
    async createVersion(input) {
      return db.transaction(async (tx) => {
        const latest = await tx
          .select({ versionNumber: documentVersions.versionNumber })
          .from(documentVersions)
          .where(eq(documentVersions.documentId, input.documentId))
          .orderBy(sql`${documentVersions.versionNumber} desc`)
          .limit(1);
        return firstOrThrow(
          await tx
            .insert(documentVersions)
            .values({
              ...input,
              objectStorageKey: input.objectStorageKey ?? null,
              versionNumber: (latest[0]?.versionNumber ?? 0) + 1,
              status: "processing",
            })
            .returning(),
          "document version",
        );
      });
    },
    async markVersionFailed({ versionId, failureCode, failureMessage }) {
      return firstOrThrow(
        await db
          .update(documentVersions)
          .set({ status: "failed", failureCode, failureMessage, updatedAt: new Date() })
          .where(eq(documentVersions.id, versionId))
          .returning(),
        "document version",
      );
    },
    async replaceActivePrivateVersion({ versionId, userId, chunkCount }) {
      return db.transaction(async (tx) => {
        const candidate = firstOrThrow(
          await tx
            .select({ version: documentVersions, document: documents })
            .from(documentVersions)
            .innerJoin(documents, eq(documentVersions.documentId, documents.id))
            .where(
              and(
                eq(documentVersions.id, versionId),
                eq(documents.visibility, "private"),
                eq(documents.ownerId, userId),
              ),
            )
            .limit(1),
          "private document version",
        );
        const timestamp = new Date();
        await tx
          .update(documentVersions)
          .set({ status: "archived", activatedAt: null, updatedAt: timestamp })
          .where(
            and(
              eq(documentVersions.documentId, candidate.version.documentId),
              sql`${documentVersions.id} <> ${versionId}`,
              sql`${documentVersions.activatedAt} is not null`,
            ),
          );
        return firstOrThrow(
          await tx
            .update(documentVersions)
            .set({ status: "ready", chunkCount, activatedAt: timestamp, updatedAt: timestamp })
            .where(eq(documentVersions.id, versionId))
            .returning(),
          "document version",
        );
      });
    },
    async publishGlobalVersion({ versionId }) {
      return db.transaction(async (tx) => {
        const candidate = firstOrThrow(
          await tx
            .select({ version: documentVersions })
            .from(documentVersions)
            .innerJoin(documents, eq(documentVersions.documentId, documents.id))
            .where(
              and(eq(documentVersions.id, versionId), eq(documents.visibility, "global")),
            )
            .limit(1),
          "global document version",
        );
        const timestamp = new Date();
        await tx
          .update(documentVersions)
          .set({ status: "archived", activatedAt: null, updatedAt: timestamp })
          .where(
            and(
              eq(documentVersions.documentId, candidate.version.documentId),
              sql`${documentVersions.id} <> ${versionId}`,
              eq(documentVersions.status, "published"),
            ),
          );
        return firstOrThrow(
          await tx
            .update(documentVersions)
            .set({
              status: "published",
              activatedAt: timestamp,
              publishedAt: timestamp,
              updatedAt: timestamp,
            })
            .where(eq(documentVersions.id, versionId))
            .returning(),
          "document version",
        );
      });
    },
    async softDeleteDocument({ documentId, ownerId }) {
      return (
        await db
          .update(documents)
          .set({ deletedAt: new Date(), updatedAt: new Date() })
          .where(
            and(
              eq(documents.id, documentId),
              eq(documents.ownerId, ownerId),
              eq(documents.visibility, "private"),
            ),
          )
          .returning()
      )[0] ?? null;
    },
  };

  const conversationsRepository: ConversationRepository = {
    async createConversation({ id, actor, gameId, title, expiresAt }) {
      const actorColumns =
        actor.kind === "user"
          ? { userId: actor.userId, guestSessionId: null }
          : { userId: null, guestSessionId: actor.guestSessionId };
      return firstOrThrow(
        await db
          .insert(conversations)
          .values({ id, gameId, title, expiresAt: expiresAt ?? null, ...actorColumns })
          .returning(),
        "conversation",
      );
    },
    async getConversationById({ id }) {
      return (await db.select().from(conversations).where(eq(conversations.id, id)).limit(1))[0] ?? null;
    },
    async getOwnedConversation({ actor, conversationId }) {
      return (
        await db
          .select()
          .from(conversations)
          .where(ownedConversationWhere(actor, conversationId))
          .limit(1)
      )[0] ?? null;
    },
    async listMessages({ actor, conversationId }) {
      const owned = await db
        .select({ id: conversations.id })
        .from(conversations)
        .where(ownedConversationWhere(actor, conversationId))
        .limit(1);
      if (!owned[0]) return [];
      const messageRows = await db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, conversationId))
        .orderBy(asc(messages.createdAt));
      const citationRows = await db
        .select()
        .from(messageCitations)
        .innerJoin(messages, eq(messageCitations.messageId, messages.id))
        .where(eq(messages.conversationId, conversationId))
        .orderBy(asc(messageCitations.rank));
      return messageRows.map((message) => ({
        ...message,
        citations: citationRows
          .filter((row) => row.message_citations.messageId === message.id)
          .map((row) => row.message_citations),
      }));
    },
    async appendUserMessage({ actor, conversationId, content }) {
      const owned = await db
        .select({ id: conversations.id })
        .from(conversations)
        .where(ownedConversationWhere(actor, conversationId))
        .limit(1);
      if (!owned[0]) throw new PersistenceNotFoundError("conversation");
      return firstOrThrow(
        await db
          .insert(messages)
          .values({ conversationId, role: "user", content })
          .returning(),
        "message",
      );
    },
    async appendAssistantMessageWithCitations({
      actor,
      conversationId,
      content,
      model,
      citations: citationInputs,
    }) {
      return db.transaction(async (tx) => {
        const owned = await tx
          .select({ id: conversations.id })
          .from(conversations)
          .where(ownedConversationWhere(actor, conversationId))
          .limit(1);
        if (!owned[0]) throw new PersistenceNotFoundError("conversation");
        const message = firstOrThrow(
          await tx
            .insert(messages)
            .values({ conversationId, role: "assistant", content, model })
            .returning(),
          "message",
        );
        const inserted = citationInputs.length
          ? await tx
              .insert(messageCitations)
              .values(citationInputs.map((citation) => ({ ...citation, messageId: message.id })))
              .returning()
          : [];
        return { ...message, citations: inserted.sort((a, b) => a.rank - b.rank) };
      });
    },
  };

  return { identity, policies, library, conversations: conversationsRepository };
};
