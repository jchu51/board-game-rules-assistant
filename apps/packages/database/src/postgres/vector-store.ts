import { Document } from "@langchain/core/documents";
import type { EmbeddingsInterface } from "@langchain/core/embeddings";
import type {
  RulebookDocument,
  RulebookDocumentInterface,
  VectorStore,
  VectorStoreSimilaritySearchInput,
} from "@board-game-rules-assistant/rag-core";
import { and, cosineDistance, eq, inArray, isNull, or, sql } from "drizzle-orm";

import type { PostgresDatabase } from "./client.js";
import {
  documentChunks,
  documents,
  documentVersions,
} from "./schema.js";

export class PostgresVectorStore implements VectorStore {
  constructor(
    private readonly db: PostgresDatabase,
    private readonly embeddings: EmbeddingsInterface,
  ) {}

  async upsert(records: RulebookDocument[]): Promise<void> {
    if (records.length === 0) return;
    const versionIds = [
      ...new Set(
        records.map(({ metadata }) => {
          if (!metadata.documentVersion) {
            throw new Error("documentVersion metadata is required for PostgreSQL upsert");
          }
          return metadata.documentVersion;
        }),
      ),
    ];
    const vectors = await this.embeddings.embedDocuments(
      records.map(({ pageContent }) => pageContent),
    );
    await this.db.transaction(async (tx) => {
      await tx.delete(documentChunks).where(inArray(documentChunks.documentVersionId, versionIds));
      await tx.insert(documentChunks).values(
        records.map((record, index) => ({
          id: record.metadata.documentChunkId,
          documentVersionId: record.metadata.documentVersion!,
          ordinal: index,
          content: record.pageContent,
          pageNumber: record.metadata.loc?.pageNumber ?? null,
          metadata: record.metadata,
          embedding: vectors[index]!,
        })),
      );
    });
  }

  async similaritySearch(
    input: VectorStoreSimilaritySearchInput,
  ): Promise<RulebookDocumentInterface[]> {
    return (await this.similaritySearchVectorWithScore(input)).map(([document]) => document);
  }

  async similaritySearchVectorWithScore(
    input: VectorStoreSimilaritySearchInput,
  ): Promise<[RulebookDocumentInterface, number][]> {
    const queryVector = await this.embeddings.embedQuery(input.query);
    const distance = cosineDistance(documentChunks.embedding, queryVector);
    const authorized = input.scope.userId
      ? or(eq(documents.visibility, "global"), eq(documents.ownerId, input.scope.userId))
      : eq(documents.visibility, "global");
    const rows = await this.db
      .select({
        chunkId: documentChunks.id,
        content: documentChunks.content,
        pageNumber: documentChunks.pageNumber,
        metadata: documentChunks.metadata,
        documentId: documents.id,
        versionId: documentVersions.id,
        gameId: documents.gameId,
        ownerId: documents.ownerId,
        visibility: documents.visibility,
        distance,
      })
      .from(documentChunks)
      .innerJoin(documentVersions, eq(documentChunks.documentVersionId, documentVersions.id))
      .innerJoin(documents, eq(documentVersions.documentId, documents.id))
      .where(
        and(
          eq(documents.gameId, input.scope.gameId),
          isNull(documents.deletedAt),
          sql`${documentVersions.activatedAt} is not null`,
          inArray(documentVersions.status, ["ready", "published"]),
          authorized,
        ),
      )
      .orderBy(distance)
      .limit(input.topK);
    return rows.map((row) => [
      new Document({
        pageContent: row.content,
        metadata: {
          ...(row.metadata as RulebookDocument["metadata"]),
          documentChunkId: row.chunkId,
          documentId: row.documentId,
          documentVersion: row.versionId,
          gameId: row.gameId,
          ownerUserId: row.ownerId ?? undefined,
          visibility: row.visibility === "private" ? "private" : "shared",
          loc: row.pageNumber === null ? undefined : { pageNumber: row.pageNumber },
        },
      }) as RulebookDocumentInterface,
      1 - Number(row.distance),
    ]);
  }
}
