import type { VectorStore } from "@board-game-rules-assistant/rag-core";

import type {
  AccountRole,
  Actor,
  ConversationRecord,
  DocumentKind,
  DocumentRecord,
  DocumentVersionRecord,
  GameRecord,
  GuestSessionRecord,
  MessageCitationRecord,
  MessageRecord,
  MessageWithCitations,
  PlanTier,
  PolicyTier,
  TierPolicyRecord,
  UserRecord,
} from "./models.js";

export type IdentityRepository = {
  createUser(input: {
    id?: string;
    email: string;
    displayName: string;
    accountRole: AccountRole;
    planTier: PlanTier;
  }): Promise<UserRecord>;
  getUserById(input: { id: string }): Promise<UserRecord | null>;
  createGuestSession(input: { expiresAt: Date }): Promise<GuestSessionRecord>;
  getGuestSession(input: { id: string }): Promise<GuestSessionRecord | null>;
};

export type PolicyRepository = {
  getTierPolicy(tier: PolicyTier): Promise<TierPolicyRecord>;
};

export type LibraryRepository = {
  createGame(input: { name: string; slug: string }): Promise<GameRecord>;
  getGameById(input: { id: string }): Promise<GameRecord | null>;
  resolveGame(input: { id?: string; name: string; slug: string }): Promise<GameRecord>;
  createDocument(input: {
    gameId: string;
    ownerId?: string | null;
    visibility: "global" | "private";
    kind: DocumentKind;
    title: string;
    fileSizeBytes?: number;
  }): Promise<DocumentRecord>;
  createPrivateDocumentWithinLimit(input: {
    gameId: string;
    ownerId: string;
    kind: DocumentKind;
    title: string;
    fileSizeBytes?: number;
    limit: number | null;
  }): Promise<
    | { document: DocumentRecord; currentUsage: number }
    | { document: null; currentUsage: number }
  >;
  getOwnedPrivateDocument(input: {
    documentId: string;
    ownerId: string;
  }): Promise<DocumentRecord | null>;
  listOwnedDocuments(input: { ownerId: string }): Promise<
    Array<{ document: DocumentRecord; game: GameRecord }>
  >;
  countActivePrivateDocuments(input: { ownerId: string }): Promise<number>;
  listRetrievableDocuments(input: {
    gameId: string;
    userId?: string;
  }): Promise<DocumentRecord[]>;
  createVersion(input: {
    documentId: string;
    checksum: string;
    embeddingProvider: string;
    embeddingModel: string;
    embeddingDimensions: number;
    objectStorageKey?: string | null;
  }): Promise<DocumentVersionRecord>;
  markVersionFailed(input: {
    versionId: string;
    failureCode: string;
    failureMessage: string;
  }): Promise<DocumentVersionRecord>;
  replaceActivePrivateVersion(input: {
    versionId: string;
    userId: string;
    chunkCount: number;
  }): Promise<DocumentVersionRecord>;
  publishGlobalVersion(input: {
    versionId: string;
  }): Promise<DocumentVersionRecord>;
  softDeleteDocument(input: {
    documentId: string;
    ownerId: string;
  }): Promise<DocumentRecord | null>;
};

export type ConversationRepository = {
  createConversation(input: {
    id?: string;
    actor: Actor;
    gameId: string;
    title: string;
    expiresAt?: Date | null;
  }): Promise<ConversationRecord>;
  getConversationById(input: { id: string }): Promise<ConversationRecord | null>;
  getOwnedConversation(input: {
    actor: Actor;
    conversationId: string;
  }): Promise<ConversationRecord | null>;
  listMessages(input: {
    actor: Actor;
    conversationId: string;
  }): Promise<MessageWithCitations[]>;
  appendUserMessage(input: {
    actor: Actor;
    conversationId: string;
    content: string;
  }): Promise<MessageRecord>;
  appendAssistantMessageWithCitations(input: {
    actor: Actor;
    conversationId: string;
    content: string;
    model: string;
    citations: Array<
      Omit<MessageCitationRecord, "messageId" | "createdAt">
    >;
  }): Promise<MessageWithCitations>;
};

export type Persistence = {
  identity: IdentityRepository;
  policies: PolicyRepository;
  library: LibraryRepository;
  conversations: ConversationRepository;
  vectorStore: VectorStore;
  healthCheck(): Promise<void>;
  close(): Promise<void>;
};

export type { VectorStore } from "@board-game-rules-assistant/rag-core";
