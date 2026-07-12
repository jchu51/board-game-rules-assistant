import { randomUUID } from "node:crypto";

import type {
  RulebookDocument,
  RulebookDocumentInterface,
  VectorStore,
  VectorStoreSimilaritySearchInput,
} from "@board-game-rules-assistant/rag-core";

import { PersistenceNotFoundError } from "../domain/errors.js";
import type {
  ConversationRecord,
  DocumentRecord,
  DocumentVersionRecord,
  GameRecord,
  GuestSessionRecord,
  MessageCitationRecord,
  MessageRecord,
  MessageWithCitations,
  TierPolicyRecord,
  UserRecord,
} from "../domain/models.js";
import type { Persistence } from "../domain/repositories.js";

const clone = <T>(value: T): T => structuredClone(value);
const now = (): Date => new Date();

const createTimestamped = () => {
  const timestamp = now();
  return { createdAt: timestamp, updatedAt: timestamp };
};

class MemoryVectorStore implements VectorStore {
  private documents: RulebookDocument[] = [];

  constructor(
    private readonly isActiveAndAuthorized: (
      document: RulebookDocument,
      input: VectorStoreSimilaritySearchInput,
    ) => boolean = ({ metadata }, input) =>
      metadata.gameId === input.scope.gameId &&
      (metadata.visibility !== "private" ||
        (input.scope.userId !== undefined &&
          metadata.ownerUserId === input.scope.userId)),
  ) {}

  async upsert(records: RulebookDocument[]): Promise<void> {
    const recordKeys = new Set(
      records
        .map(
          (record) =>
            record.metadata.documentVersion ?? record.metadata.documentId,
        )
        .filter((key): key is string => key !== undefined),
    );
    this.documents = this.documents.filter(
      (document) =>
        (document.metadata.documentVersion ?? document.metadata.documentId) ===
          undefined ||
        !recordKeys.has(
          (document.metadata.documentVersion ?? document.metadata.documentId)!,
        ),
    );
    this.documents.push(
      ...records.map((record) => {
        const copy = clone(record);
        copy.metadata.documentChunkId ??= randomUUID();
        return copy;
      }),
    );
  }

  async similaritySearch(
    input: VectorStoreSimilaritySearchInput,
  ): Promise<RulebookDocumentInterface[]> {
    return this.select(input).map((document) => clone(document));
  }

  async similaritySearchVectorWithScore(
    input: VectorStoreSimilaritySearchInput,
  ): Promise<[RulebookDocumentInterface, number][]> {
    return this.select(input).map((document) => [clone(document), 1]);
  }

  private select(input: VectorStoreSimilaritySearchInput): RulebookDocument[] {
    const filtered = this.documents.filter((document) =>
      this.isActiveAndAuthorized(document, input),
    );
    return filtered.slice(0, input.topK);
  }
}

const seededPolicies: TierPolicyRecord[] = [
  {
    tier: "guest",
    retrievalTopK: 3,
    privateUploadLimit: 0,
    conversationTtlDays: 7,
  },
  {
    tier: "standard",
    retrievalTopK: 5,
    privateUploadLimit: 3,
    conversationTtlDays: null,
  },
  {
    tier: "pro",
    retrievalTopK: 8,
    privateUploadLimit: null,
    conversationTtlDays: null,
  },
];

export const createMemoryPersistence = async (): Promise<Persistence> => {
  const users = new Map<string, UserRecord>();
  const guestSessions = new Map<string, GuestSessionRecord>();
  const policies = new Map(
    seededPolicies.map((policy) => [policy.tier, clone(policy)]),
  );
  const games = new Map<string, GameRecord>();
  const documents = new Map<string, DocumentRecord>();
  const versions = new Map<string, DocumentVersionRecord>();
  const conversations = new Map<string, ConversationRecord>();
  const messages: MessageRecord[] = [];
  const citations: MessageCitationRecord[] = [];

  const ownsConversation = (
    conversation: ConversationRecord,
    actor: Parameters<Persistence["conversations"]["getOwnedConversation"]>[0]["actor"],
  ): boolean =>
    actor.kind === "user"
      ? conversation.userId === actor.userId
      : conversation.guestSessionId === actor.guestSessionId;

  return {
    identity: {
      async createUser(input) {
        const { id, ...attributes } = input;
        const record: UserRecord = {
          id: id ?? randomUUID(),
          ...clone(attributes),
          ...createTimestamped(),
        };
        users.set(record.id, clone(record));
        return clone(record);
      },
      async getUserById({ id }) {
        const record = users.get(id);
        return record ? clone(record) : null;
      },
      async createGuestSession(input) {
        const record: GuestSessionRecord = {
          id: randomUUID(),
          createdAt: now(),
          expiresAt: clone(input.expiresAt),
        };
        guestSessions.set(record.id, clone(record));
        return clone(record);
      },
      async getGuestSession({ id }) {
        const record = guestSessions.get(id);
        return record ? clone(record) : null;
      },
      async deleteExpiredGuestSessions({ now: cutoff }) {
        const expiredIds = [...guestSessions.values()].filter(({ expiresAt }) => expiresAt <= cutoff).map(({ id }) => id);
        for (const id of expiredIds) guestSessions.delete(id);
        const conversationIds = new Set([...conversations.values()].filter(({ guestSessionId }) => guestSessionId !== null && expiredIds.includes(guestSessionId)).map(({ id }) => id));
        for (const id of conversationIds) conversations.delete(id);
        const messageIds = new Set(messages.filter(({ conversationId }) => conversationIds.has(conversationId)).map(({ id }) => id));
        for (let index = messages.length - 1; index >= 0; index--) if (conversationIds.has(messages[index]!.conversationId)) messages.splice(index, 1);
        for (let index = citations.length - 1; index >= 0; index--) if (messageIds.has(citations[index]!.messageId)) citations.splice(index, 1);
        return expiredIds.length;
      },
    },
    policies: {
      async getTierPolicy(tier) {
        const policy = policies.get(tier);
        if (!policy) throw new PersistenceNotFoundError("tier policy");
        return clone(policy);
      },
    },
    library: {
      async createGame(input) {
        const record: GameRecord = {
          id: randomUUID(),
          ...clone(input),
          ...createTimestamped(),
        };
        games.set(record.id, clone(record));
        return clone(record);
      },
      async getGameById({ id }) {
        const record = games.get(id);
        return record ? clone(record) : null;
      },
      async resolveGame(input) {
        const existing = [...games.values()].find((game) => game.slug === input.slug);
        if (existing) return clone(existing);
        const { id, ...attributes } = input;
        const record: GameRecord = { id: id ?? randomUUID(), ...clone(attributes), ...createTimestamped() };
        games.set(record.id, clone(record));
        return clone(record);
      },
      async createDocument(input) {
        const ownerId = input.ownerId ?? null;
        const record: DocumentRecord = {
          id: randomUUID(),
          gameId: input.gameId,
          ownerId,
          visibility: input.visibility,
          kind: input.kind,
          title: input.title,
          fileSizeBytes: input.fileSizeBytes ?? 0,
          deletedAt: null,
          ...createTimestamped(),
        };
        documents.set(record.id, clone(record));
        return clone(record);
      },
      async createPrivateDocumentWithinLimit(input) {
        const currentUsage = [...documents.values()].filter(
          (document) => document.ownerId === input.ownerId && document.visibility === "private" && document.deletedAt === null,
        ).length;
        if (input.limit !== null && currentUsage >= input.limit) return { document: null, currentUsage };
        const record: DocumentRecord = {
          id: randomUUID(), gameId: input.gameId, ownerId: input.ownerId,
          visibility: "private", kind: input.kind, title: input.title,
          fileSizeBytes: input.fileSizeBytes ?? 0, deletedAt: null, ...createTimestamped(),
        };
        documents.set(record.id, clone(record));
        return { document: clone(record), currentUsage };
      },
      async getOwnedPrivateDocument({ documentId, ownerId }) {
        const document = documents.get(documentId);
        return document?.ownerId === ownerId && document.visibility === "private" && document.deletedAt === null
          ? clone(document)
          : null;
      },
      async getGlobalDocument({ documentId, gameId }) {
        const document = documents.get(documentId);
        return document?.gameId === gameId && document.visibility === "global" && document.deletedAt === null ? clone(document) : null;
      },
      async listOwnedDocuments({ ownerId }) {
        return [...documents.values()]
          .filter((document) => document.ownerId === ownerId && document.deletedAt === null)
          .map((document) => ({ document: clone(document), game: clone(games.get(document.gameId)!) }));
      },
      async countActivePrivateDocuments({ ownerId }) {
        return [...documents.values()].filter(
          (document) =>
            document.ownerId === ownerId &&
            document.visibility === "private" &&
            document.deletedAt === null,
        ).length;
      },
      async listRetrievableDocuments({ gameId, userId }) {
        return [...documents.values()]
          .filter(
            (document) =>
              document.gameId === gameId &&
              document.deletedAt === null &&
              (document.visibility === "global" ||
                (userId !== undefined && document.ownerId === userId)),
          )
          .map(clone);
      },
      async createVersion(input) {
        const versionNumber =
          Math.max(
            0,
            ...[...versions.values()]
              .filter((version) => version.documentId === input.documentId)
              .map((version) => version.versionNumber),
          ) + 1;
        const record: DocumentVersionRecord = {
          id: randomUUID(),
          documentId: input.documentId,
          versionNumber,
          status: "processing",
          checksum: input.checksum,
          embeddingProvider: input.embeddingProvider,
          embeddingModel: input.embeddingModel,
          embeddingDimensions: input.embeddingDimensions,
          chunkCount: 0,
          failureCode: null,
          failureMessage: null,
          activatedAt: null,
          publishedAt: null,
          verifiedAt: null,
          verifiedBy: null,
          objectStorageKey: input.objectStorageKey ?? null,
          ...createTimestamped(),
        };
        versions.set(record.id, clone(record));
        return clone(record);
      },
      async createGlobalDraftVersion(input) {
        const document = documents.get(input.documentId);
        if (!document || document.visibility !== "global") throw new PersistenceNotFoundError("global document");
        const versionNumber = Math.max(0, ...[...versions.values()].filter((version) => version.documentId === input.documentId).map((version) => version.versionNumber)) + 1;
        const record: DocumentVersionRecord = {
          id: randomUUID(), documentId: input.documentId, versionNumber, status: "draft",
          checksum: input.checksum, embeddingProvider: input.embeddingProvider,
          embeddingModel: input.embeddingModel, embeddingDimensions: input.embeddingDimensions,
          chunkCount: 0, failureCode: null, failureMessage: null, activatedAt: null,
          publishedAt: null, verifiedAt: null, verifiedBy: null,
          objectStorageKey: input.objectStorageKey ?? null, ...createTimestamped(),
        };
        versions.set(record.id, clone(record));
        return clone(record);
      },
      async startGlobalVersionProcessing({ versionId }) {
        const record = versions.get(versionId);
        const document = record && documents.get(record.documentId);
        if (!record || document?.visibility !== "global" || record.status !== "draft") throw new PersistenceNotFoundError("draft global document version");
        const updated = { ...record, status: "processing" as const, updatedAt: now() };
        versions.set(versionId, clone(updated));
        return clone(updated);
      },
      async getVersion({ versionId }) {
        const record = versions.get(versionId);
        return record ? clone(record) : null;
      },
      async markGlobalVersionReady({ versionId, chunkCount }) {
        const record = versions.get(versionId);
        const document = record && documents.get(record.documentId);
        if (!record || document?.visibility !== "global" || record.status !== "processing") throw new PersistenceNotFoundError("processing global document version");
        const updated = { ...record, status: "ready" as const, chunkCount, updatedAt: now() };
        versions.set(versionId, clone(updated));
        return clone(updated);
      },
      async verifyGlobalVersion({ versionId, verifiedBy }) {
        const record = versions.get(versionId);
        const document = record && documents.get(record.documentId);
        if (!record || document?.visibility !== "global" || record.status !== "ready") throw new PersistenceNotFoundError("ready global document version");
        const timestamp = now();
        const updated = { ...record, verifiedAt: timestamp, verifiedBy, updatedAt: timestamp };
        versions.set(versionId, clone(updated));
        return clone(updated);
      },
      async markVersionFailed({ versionId, failureCode, failureMessage }) {
        const record = versions.get(versionId);
        if (!record || !["processing", "ready"].includes(record.status)) throw new PersistenceNotFoundError("failable document version");
        const updated = {
          ...record,
          status: "failed" as const,
          failureCode,
          failureMessage,
          updatedAt: now(),
        };
        versions.set(versionId, clone(updated));
        return clone(updated);
      },
      async replaceActivePrivateVersion({ versionId, userId, chunkCount }) {
        const record = versions.get(versionId);
        if (!record) throw new PersistenceNotFoundError("document version");
        const document = documents.get(record.documentId);
        if (
          !document ||
          document.visibility !== "private" ||
          document.ownerId !== userId
        ) {
          throw new PersistenceNotFoundError("private document version");
        }
        const timestamp = now();
        for (const version of versions.values()) {
          if (
            version.documentId === record.documentId &&
            version.id !== record.id &&
            version.activatedAt !== null
          ) {
            versions.set(version.id, {
              ...version,
              status: "archived",
              activatedAt: null,
              updatedAt: timestamp,
            });
          }
        }
        const updated: DocumentVersionRecord = {
          ...record,
          status: "ready",
          chunkCount,
          activatedAt: timestamp,
          updatedAt: timestamp,
        };
        versions.set(versionId, clone(updated));
        return clone(updated);
      },
      async publishGlobalVersion({ versionId }) {
        const record = versions.get(versionId);
        const document = record && documents.get(record.documentId);
        if (!record || document?.visibility !== "global" || record.status !== "ready" || !record.verifiedAt) throw new PersistenceNotFoundError("verified global document version");
        const timestamp = now();
        for (const version of versions.values()) {
          if (
            version.documentId === record.documentId &&
            version.id !== record.id &&
            version.status === "published"
          ) {
            versions.set(version.id, {
              ...version,
              status: "archived",
              activatedAt: null,
              updatedAt: timestamp,
            });
          }
        }
        const updated: DocumentVersionRecord = {
          ...record,
          status: "published",
          activatedAt: timestamp,
          publishedAt: timestamp,
          updatedAt: timestamp,
        };
        versions.set(versionId, clone(updated));
        return clone(updated);
      },
      async softDeleteDocument({ documentId, ownerId }) {
        const record = documents.get(documentId);
        if (!record || record.ownerId !== ownerId) return null;
        const timestamp = now();
        const updated = {
          ...record,
          deletedAt: timestamp,
          updatedAt: timestamp,
        };
        documents.set(documentId, clone(updated));
        return clone(updated);
      },
    },
    conversations: {
      async createConversation({ id, actor, gameId, title }) {
        if (id && conversations.has(id)) {
          throw new Error("conversation id already exists");
        }
        const guestSession = actor.kind === "guest" ? guestSessions.get(actor.guestSessionId) : undefined;
        if (actor.kind === "guest" && !guestSession) throw new PersistenceNotFoundError("guest session");
        const record: ConversationRecord = {
          id: id ?? randomUUID(),
          gameId,
          userId: actor.kind === "user" ? actor.userId : null,
          guestSessionId:
            actor.kind === "guest" ? actor.guestSessionId : null,
          title,
          expiresAt: actor.kind === "guest" ? clone(guestSession!.expiresAt) : null,
          ...createTimestamped(),
        };
        conversations.set(record.id, clone(record));
        return clone(record);
      },
      async getConversationById({ id }) {
        const record = conversations.get(id);
        return record ? clone(record) : null;
      },
      async getOwnedConversation({ actor, conversationId }) {
        const record = conversations.get(conversationId);
        return record && ownsConversation(record, actor) ? clone(record) : null;
      },
      async listOwnedConversations({ actor }) {
        return [...conversations.values()].filter((conversation) => ownsConversation(conversation, actor)).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id)).map(clone);
      },
      async deleteOwnedConversation({ actor, conversationId }) {
        const conversation = conversations.get(conversationId);
        if (!conversation || !ownsConversation(conversation, actor)) return false;
        conversations.delete(conversationId);
        const messageIds = new Set(messages.filter((message) => message.conversationId === conversationId).map(({ id }) => id));
        for (let index = messages.length - 1; index >= 0; index--) if (messages[index]!.conversationId === conversationId) messages.splice(index, 1);
        for (let index = citations.length - 1; index >= 0; index--) if (messageIds.has(citations[index]!.messageId)) citations.splice(index, 1);
        return true;
      },
      async listMessages({ actor, conversationId }) {
        const conversation = conversations.get(conversationId);
        if (!conversation || !ownsConversation(conversation, actor)) return [];
        return messages
          .filter((message) => message.conversationId === conversationId)
          .map((message) => ({
            ...clone(message),
            citations: citations
              .filter((citation) => citation.messageId === message.id)
              .sort((left, right) => left.rank - right.rank)
              .map(clone),
          }));
      },
      async appendUserMessage({ actor, conversationId, content }) {
        const conversation = conversations.get(conversationId);
        if (!conversation || !ownsConversation(conversation, actor)) {
          throw new PersistenceNotFoundError("conversation");
        }
        const record: MessageRecord = {
          id: randomUUID(),
          conversationId,
          role: "user",
          content,
          model: null,
          ...createTimestamped(),
        };
        messages.push(clone(record));
        return clone(record);
      },
      async appendAssistantMessageWithCitations({
        actor,
        conversationId,
        content,
        model,
        citations: citationInputs,
      }) {
        const conversation = conversations.get(conversationId);
        if (!conversation || !ownsConversation(conversation, actor)) {
          throw new PersistenceNotFoundError("conversation");
        }
        const record: MessageRecord = {
          id: randomUUID(),
          conversationId,
          role: "assistant",
          content,
          model,
          ...createTimestamped(),
        };
        const citationRecords = citationInputs.map(
          (citation): MessageCitationRecord => ({
            ...clone(citation),
            messageId: record.id,
            createdAt: now(),
          }),
        );
        messages.push(clone(record));
        citations.push(...citationRecords.map(clone));
        const result: MessageWithCitations = {
          ...record,
          citations: citationRecords,
        };
        return clone(result);
      },
    },
    vectorStore: new MemoryVectorStore(({ metadata }, input) => {
      const document = metadata.documentId
        ? documents.get(metadata.documentId)
        : undefined;
      const version = metadata.documentVersion
        ? versions.get(metadata.documentVersion)
        : undefined;
      if (!document || !version) {
        return (
          metadata.gameId === input.scope.gameId &&
          (metadata.visibility !== "private" ||
            (input.scope.userId !== undefined &&
              metadata.ownerUserId === input.scope.userId))
        );
      }
      return (
        document.gameId === input.scope.gameId &&
        document.deletedAt === null &&
        version.activatedAt !== null &&
        (version.status === "ready" || version.status === "published") &&
        (document.visibility === "global" ||
          (input.scope.userId !== undefined &&
            document.ownerId === input.scope.userId))
      );
    }),
    async healthCheck() {},
    async close() {},
  };
};
