import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import type { Actor, LibraryRepository } from "@board-game-rules-assistant/database";
import type { IngestPdfInput, IngestionResult } from "./ingestion-types";

type PdfIngestion = { ingestPdf(input: IngestPdfInput): Promise<IngestionResult> };

const slugify = (name: string): string =>
  name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const requireUser = (actor: Actor) => {
  if (actor.kind !== "user") throw new Error("Guests cannot upload or manage rulebooks");
  return actor;
};

export class RulebookService {
  constructor(
    private readonly library: LibraryRepository,
    private readonly ingestion: PdfIngestion,
    private readonly embedding: { embeddingModel: string; embeddingDimensions: number },
  ) {}

  async upload(input: {
    actor: Actor;
    filePath: string;
    pdfName: string;
    fileSize: number;
    gameName: string;
    splitterParams?: IngestPdfInput["splitterParams"];
  }) {
    const user = requireUser(input.actor);
    const game = await this.library.resolveGame({ name: input.gameName, slug: slugify(input.gameName) });
    const document = await this.library.createDocument({
      gameId: game.id,
      ownerId: user.userId,
      visibility: "private",
      kind: "base_rules",
      title: input.pdfName,
      fileSizeBytes: input.fileSize,
    });
    const checksum = createHash("sha256").update(await readFile(input.filePath).catch(() => input.pdfName)).digest("hex");
    const version = await this.library.createVersion({
      documentId: document.id,
      checksum,
      embeddingProvider: "openai",
      embeddingModel: this.embedding.embeddingModel,
      embeddingDimensions: this.embedding.embeddingDimensions,
    });
    try {
      const result = await this.ingestion.ingestPdf({
        filePath: input.filePath,
        source: input.pdfName,
        splitterParams: input.splitterParams,
        metadata: {
          documentId: document.id,
          documentVersion: version.id,
          gameId: game.id,
          ownerUserId: user.userId,
          visibility: "private",
        },
      });
      await this.library.replaceActivePrivateVersion({ versionId: version.id, userId: user.userId, chunkCount: result.chunkCount });
      return { ...result, id: document.id, versionId: version.id, gameId: game.id, gameName: game.name, pdfName: document.title, fileSize: document.fileSizeBytes, status: "completed" as const };
    } catch (error) {
      await this.library.markVersionFailed({ versionId: version.id, failureCode: "INGESTION_FAILED", failureMessage: error instanceof Error ? error.message : "Ingestion failed" });
      throw error;
    }
  }

  async list(actor: Actor) {
    const user = requireUser(actor);
    return (await this.library.listOwnedDocuments({ ownerId: user.userId })).map(({ document, game }) => ({
      id: document.id,
      gameName: game.name,
      pdfName: document.title,
      fileSize: document.fileSizeBytes,
    }));
  }

  async delete(actor: Actor, documentId: string): Promise<boolean> {
    const user = requireUser(actor);
    return (await this.library.softDeleteDocument({ documentId, ownerId: user.userId })) !== null;
  }
}
