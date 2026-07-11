export type AccountRole = "user" | "admin";
export type PlanTier = "standard" | "pro";
export type PolicyTier = "guest" | PlanTier;
export type Actor =
  | { kind: "guest"; guestSessionId: string }
  | {
      kind: "user";
      userId: string;
      accountRole: AccountRole;
      planTier: PlanTier;
    };

export type TimestampedRecord = {
  createdAt: Date;
  updatedAt: Date;
};

export type UserRecord = TimestampedRecord & {
  id: string;
  email: string;
  displayName: string;
  accountRole: AccountRole;
  planTier: PlanTier;
};

export type GuestSessionRecord = {
  id: string;
  createdAt: Date;
  expiresAt: Date;
};

export type TierPolicyRecord = {
  tier: PolicyTier;
  retrievalTopK: number;
  privateUploadLimit: number | null;
  conversationTtlDays: number | null;
};

export type GameRecord = TimestampedRecord & {
  id: string;
  name: string;
  slug: string;
};

export type DocumentVisibility = "global" | "private";
export type DocumentKind = "base_rules" | "expansion" | "errata" | "other";
export type DocumentRecord = TimestampedRecord & {
  id: string;
  gameId: string;
  ownerId: string | null;
  visibility: DocumentVisibility;
  kind: DocumentKind;
  title: string;
  fileSizeBytes: number;
  deletedAt: Date | null;
};

export type DocumentVersionStatus =
  | "draft"
  | "processing"
  | "ready"
  | "published"
  | "failed"
  | "archived";
export type DocumentVersionRecord = TimestampedRecord & {
  id: string;
  documentId: string;
  versionNumber: number;
  status: DocumentVersionStatus;
  checksum: string;
  embeddingProvider: string;
  embeddingModel: string;
  embeddingDimensions: number;
  chunkCount: number;
  failureCode: string | null;
  failureMessage: string | null;
  activatedAt: Date | null;
  publishedAt: Date | null;
  objectStorageKey: string | null;
};

export type ConversationRecord = TimestampedRecord & {
  id: string;
  gameId: string;
  userId: string | null;
  guestSessionId: string | null;
  title: string;
  expiresAt: Date | null;
};

export type MessageRole = "user" | "assistant" | "system";
export type MessageRecord = TimestampedRecord & {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  model: string | null;
};

export type MessageCitationRecord = {
  messageId: string;
  documentChunkId: string;
  rank: number;
  distance: number | null;
  quotedText: string;
  createdAt: Date;
};

export type MessageWithCitations = MessageRecord & {
  citations: MessageCitationRecord[];
};
