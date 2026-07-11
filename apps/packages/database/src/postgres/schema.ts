import { sql } from "drizzle-orm";
import { check, doublePrecision, index, integer, jsonb, pgEnum, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid, vector } from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

export const accountRoleEnum = pgEnum("account_role", ["user", "admin"]);
export const planTierEnum = pgEnum("plan_tier", ["standard", "pro"]);
export const policyTierEnum = pgEnum("policy_tier", ["guest", "standard", "pro"]);
export const documentVisibilityEnum = pgEnum("document_visibility", ["global", "private"]);
export const documentKindEnum = pgEnum("document_kind", ["base_rules", "expansion", "errata", "other"]);
export const documentVersionStatusEnum = pgEnum("document_version_status", ["draft", "processing", "ready", "published", "failed", "archived"]);
export const messageRoleEnum = pgEnum("message_role", ["user", "assistant", "system"]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(), email: text("email").notNull().unique(),
  displayName: text("display_name").notNull(), accountRole: accountRoleEnum("account_role").notNull().default("user"),
  planTier: planTierEnum("plan_tier").notNull().default("standard"), ...timestamps,
});
export const guestSessions = pgTable("guest_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});
export const tierPolicies = pgTable("tier_policies", {
  tier: policyTierEnum("tier").primaryKey(), retrievalTopK: integer("retrieval_top_k").notNull(),
  privateUploadLimit: integer("private_upload_limit"), conversationTtlDays: integer("conversation_ttl_days"), ...timestamps,
});
export const games = pgTable("games", {
  id: uuid("id").primaryKey().defaultRandom(), name: text("name").notNull(), slug: text("slug").notNull().unique(), ...timestamps,
});
export const documents = pgTable("documents", {
  id: uuid("id").primaryKey().defaultRandom(), gameId: uuid("game_id").notNull().references(() => games.id),
  ownerId: uuid("owner_id").references(() => users.id), visibility: documentVisibilityEnum("visibility").notNull(),
  kind: documentKindEnum("kind").notNull(), title: text("title").notNull(),
  fileSizeBytes: integer("file_size_bytes").notNull().default(0),
  deletedAt: timestamp("deleted_at", { withTimezone: true }), ...timestamps,
}, (table) => [
  check("documents_visibility_owner_check", sql`(${table.visibility} = 'global' AND ${table.ownerId} IS NULL) OR (${table.visibility} = 'private' AND ${table.ownerId} IS NOT NULL)`),
  index("documents_game_id_idx").on(table.gameId), index("documents_owner_id_idx").on(table.ownerId), index("documents_visibility_idx").on(table.visibility),
]);
export const documentVersions = pgTable("document_versions", {
  id: uuid("id").primaryKey().defaultRandom(), documentId: uuid("document_id").notNull().references(() => documents.id),
  versionNumber: integer("version_number").notNull(), status: documentVersionStatusEnum("status").notNull().default("draft"),
  checksum: text("checksum").notNull(), embeddingProvider: text("embedding_provider").notNull(),
  embeddingModel: text("embedding_model").notNull(), embeddingDimensions: integer("embedding_dimensions").notNull(),
  chunkCount: integer("chunk_count").notNull().default(0), failureCode: text("failure_code"), failureMessage: text("failure_message"),
  activatedAt: timestamp("activated_at", { withTimezone: true }), publishedAt: timestamp("published_at", { withTimezone: true }),
  objectStorageKey: text("object_storage_key"), ...timestamps,
}, (table) => [
  uniqueIndex("document_versions_document_version_unique").on(table.documentId, table.versionNumber),
  uniqueIndex("document_versions_active_unique").on(table.documentId).where(sql`${table.activatedAt} IS NOT NULL AND ${table.status} IN ('ready', 'published')`),
  uniqueIndex("document_versions_published_unique").on(table.documentId).where(sql`${table.status} = 'published'`),
  index("document_versions_document_id_idx").on(table.documentId), index("document_versions_status_idx").on(table.status),
]);
export const documentChunks = pgTable("document_chunks", {
  id: uuid("id").primaryKey().defaultRandom(),
  documentVersionId: uuid("document_version_id").notNull().references(() => documentVersions.id, { onDelete: "cascade" }),
  ordinal: integer("ordinal").notNull(), content: text("content").notNull(), pageNumber: integer("page_number"),
  metadata: jsonb("metadata").notNull().default({}), embedding: vector("embedding", { dimensions: 3072 }).notNull(), ...timestamps,
}, (table) => [uniqueIndex("document_chunks_version_ordinal_unique").on(table.documentVersionId, table.ordinal), index("document_chunks_document_version_id_idx").on(table.documentVersionId)]);
export const conversations = pgTable("conversations", {
  id: uuid("id").primaryKey().defaultRandom(), gameId: uuid("game_id").notNull().references(() => games.id),
  userId: uuid("user_id").references(() => users.id), guestSessionId: uuid("guest_session_id").references(() => guestSessions.id, { onDelete: "cascade" }),
  title: text("title").notNull(), expiresAt: timestamp("expires_at", { withTimezone: true }), ...timestamps,
}, (table) => [
  check("conversations_actor_xor_check", sql`(${table.userId} IS NOT NULL) <> (${table.guestSessionId} IS NOT NULL)`),
  index("conversations_user_id_idx").on(table.userId), index("conversations_guest_session_id_idx").on(table.guestSessionId), index("conversations_game_id_idx").on(table.gameId),
]);
export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(), conversationId: uuid("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  role: messageRoleEnum("role").notNull(), content: text("content").notNull(), model: text("model"), ...timestamps,
}, (table) => [index("messages_conversation_id_idx").on(table.conversationId)]);
export const messageCitations = pgTable("message_citations", {
  messageId: uuid("message_id").notNull().references(() => messages.id, { onDelete: "cascade" }),
  documentChunkId: uuid("document_chunk_id").notNull().references(() => documentChunks.id, { onDelete: "cascade" }),
  rank: integer("rank").notNull(), distance: doublePrecision("distance"), quotedText: text("quoted_text").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [primaryKey({ columns: [table.messageId, table.documentChunkId] })]);
