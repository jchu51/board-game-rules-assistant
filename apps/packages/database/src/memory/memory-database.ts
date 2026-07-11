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

  async upsert(records: RulebookDocument[]): Promise<void> {
    this.documents.push(...records);
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
    const filtered = input.filter
      ? this.documents.filter((document) => input.filter?.(document))
      : this.documents;
    return filtered.slice(0, input.topK ?? 4);
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
        const record: UserRecord = {
          id: randomUUID(),
          ...clone(input),
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
      async createDocument(input) {
        const ownerId = input.ownerId ?? null;
        const record: DocumentRecord = {
          id: randomUUID(),
          gameId: input.gameId,
          ownerId,
          visibility: input.visibility,
          kind: input.kind,
          title: input.title,
          deletedAt: null,
          ...createTimestamped(),
        };
        documents.set(record.id, clone(record));
        return clone(record);
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
          objectStorageKey: input.objectStorageKey ?? null,
          ...createTimestamped(),
        };
        versions.set(record.id, clone(record));
        return clone(record);
      },
      async markVersionFailed({ versionId, failureCode, failureMessage }) {
        const record = versions.get(versionId);
        if (!record) throw new PersistenceNotFoundError("document version");
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
      async replaceActivePrivateVersion({ versionId, chunkCount }) {
        const record = versions.get(versionId);
        if (!record) throw new PersistenceNotFoundError("document version");
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
        if (!record) throw new PersistenceNotFoundError("document version");
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
      async createConversation({ actor, gameId, title, expiresAt }) {
        const record: ConversationRecord = {
          id: randomUUID(),
          gameId,
          userId: actor.kind === "user" ? actor.userId : null,
          guestSessionId:
            actor.kind === "guest" ? actor.guestSessionId : null,
          title,
          expiresAt: expiresAt ? clone(expiresAt) : null,
          ...createTimestamped(),
        };
        conversations.set(record.id, clone(record));
        return clone(record);
      },
      async getOwnedConversation({ actor, conversationId }) {
        const record = conversations.get(conversationId);
        return record && ownsConversation(record, actor) ? clone(record) : null;
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
    vectorStore: new MemoryVectorStore(),
    async healthCheck() {},
    async close() {},
  };
};
