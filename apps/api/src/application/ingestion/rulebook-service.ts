import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import type { Actor, LibraryRepository } from "@board-game-rules-assistant/database";
import type { IngestPdfInput, IngestionResult } from "./ingestion-types";
import type { AccessPolicyService } from "../access/access-policy-service";
import { PlanLimitReachedError } from "../access/access-policy-service";
import { UnauthorizedResourceError } from "../../domain/identity/actor";
import { sanitizedIngestionFailure } from "./ingestion-failure";

type PdfIngestion = { ingestPdf(input: IngestPdfInput): Promise<IngestionResult> };

const slugify = (name: string): string =>
  name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const requireUser = (actor: Actor) => {
  if (actor.kind !== "user") throw new PlanLimitReachedError(0, 0);
  return actor;
};

export class RulebookService {
  constructor(
    private readonly library: LibraryRepository,
    private readonly accessPolicy: AccessPolicyService,
    private readonly ingestion: PdfIngestion,
    private readonly embedding: { embeddingModel: string; embeddingDimensions: number },
  ) {}

  async upload(input: {
    actor: Actor;
    filePath: string;
    pdfName: string;
    fileSize: number;
    gameName: string;
    gameId?: string;
    documentId?: string;
    kind?: IngestPdfInput["kind"];
    title?: string;
    splitterParams?: IngestPdfInput["splitterParams"];
  }) {
    const user = requireUser(input.actor);
    const existingDocument = input.documentId
      ? await this.library.getOwnedPrivateDocument({ documentId: input.documentId, ownerId: user.userId })
      : null;
    if (input.documentId && !existingDocument) throw new UnauthorizedResourceError();
    const game = existingDocument
      ? await this.library.getGameById({ id: existingDocument.gameId })
      : input.gameId
        ? await this.library.getGameById({ id: input.gameId })
        : await this.library.resolveGame({ name: input.gameName, slug: slugify(input.gameName) });
    if (!game) throw new UnauthorizedResourceError();
    const checksum = createHash("sha256").update(await readFile(input.filePath).catch(() => input.pdfName)).digest("hex");
    const document = existingDocument ?? await this.accessPolicy.createPrivateDocument(user, {
      gameId: game.id,
      kind: input.kind ?? "base_rules",
      title: input.title ?? input.pdfName,
      fileSizeBytes: input.fileSize,
    });
    let version: Awaited<ReturnType<LibraryRepository["createVersion"]>> | undefined;
    try {
      version = await this.library.createVersion({
        documentId: document.id,
        checksum,
        embeddingProvider: "openai",
        embeddingModel: this.embedding.embeddingModel,
        embeddingDimensions: this.embedding.embeddingDimensions,
      });
      const result = await this.ingestion.ingestPdf({
        actor: user,
        gameId: game.id,
        title: input.title ?? input.pdfName,
        kind: input.kind ?? document.kind,
        documentId: input.documentId,
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
      if (version) {
        try {
          await this.library.markVersionFailed({ versionId: version.id, ...sanitizedIngestionFailure() });
        } finally {
          if (!existingDocument) {
            await this.library.softDeleteDocument({ documentId: document.id, ownerId: user.userId });
          }
        }
      } else if (!existingDocument) {
        await this.library.softDeleteDocument({ documentId: document.id, ownerId: user.userId });
      }
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
