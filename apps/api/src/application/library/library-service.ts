import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import type { Actor, DocumentKind, LibraryRepository } from "@board-game-rules-assistant/database";
import type { IngestPdfInput, IngestionResult } from "../ingestion/ingestion-types";
import type { AccessPolicyService } from "../access/access-policy-service";
import { UnauthorizedResourceError } from "../../domain/identity/actor";

type PdfIngestion = { ingestPdf(input: IngestPdfInput): Promise<IngestionResult> };

export const allowedTransitions = {
  draft: ["processing"], processing: ["ready", "failed"], ready: ["published", "failed"],
  published: ["archived"], failed: [], archived: [],
} as const;

export class InvalidLibraryTransitionError extends Error {
  readonly code = "INVALID_LIBRARY_TRANSITION";
  constructor(message: string) { super(message); this.name = "InvalidLibraryTransitionError"; }
}

const assertTransition = <From extends keyof typeof allowedTransitions>(from: From, to: string): void => {
  if (!(allowedTransitions[from] as readonly string[]).includes(to)) {
    throw new InvalidLibraryTransitionError(`Cannot transition a global version from ${from} to ${to}`);
  }
};

export class LibraryService {
  constructor(
    private readonly library: LibraryRepository,
    private readonly accessPolicy: AccessPolicyService,
    private readonly ingestion: PdfIngestion,
    private readonly embedding: { embeddingModel: string; embeddingDimensions: number },
  ) {}

  async createGlobalDraft(input: {
    actor: Actor; gameId: string; documentId?: string; filePath: string; pdfName: string;
    fileSize: number; title: string; kind: DocumentKind;
  }) {
    this.accessPolicy.assertAdmin(input.actor);
    const game = await this.library.getGameById({ id: input.gameId });
    if (!game) throw new UnauthorizedResourceError();
    const existing = input.documentId ? await this.library.getGlobalDocument({ documentId: input.documentId, gameId: input.gameId }) : null;
    if (input.documentId && !existing) throw new UnauthorizedResourceError();
    const checksum = createHash("sha256").update(await readFile(input.filePath).catch(() => input.pdfName)).digest("hex");
    const document = existing ?? await this.library.createDocument({ gameId: input.gameId, ownerId: null, visibility: "global", kind: input.kind, title: input.title, fileSizeBytes: input.fileSize });
    const version = await this.library.createVersion({ documentId: document.id, checksum, embeddingProvider: "openai", embeddingModel: this.embedding.embeddingModel, embeddingDimensions: this.embedding.embeddingDimensions });
    try {
      const result = await this.ingestion.ingestPdf({ actor: input.actor, gameId: input.gameId, title: input.title, kind: input.kind, documentId: document.id, filePath: input.filePath, source: input.pdfName, metadata: { documentId: document.id, documentVersion: version.id, gameId: input.gameId, visibility: "community" } });
      assertTransition(version.status, "ready");
      return { document, version: await this.library.markGlobalVersionReady({ versionId: version.id, chunkCount: result.chunkCount }) };
    } catch (error) {
      assertTransition(version.status, "failed");
      await this.library.markVersionFailed({ versionId: version.id, failureCode: "INGESTION_FAILED", failureMessage: error instanceof Error ? error.message : "Ingestion failed" });
      throw error;
    }
  }

  async verifyGlobalVersion(actor: Actor, versionId: string) {
    this.accessPolicy.assertAdmin(actor);
    if (actor.kind !== "user") throw new InvalidLibraryTransitionError("Admin actor resolution failed");
    const version = await this.library.getVersion({ versionId });
    if (!version || version.status !== "ready") throw new InvalidLibraryTransitionError("Only ready global versions can be verified");
    return this.library.verifyGlobalVersion({ versionId, verifiedBy: actor.userId });
  }

  async publishGlobalVersion(actor: Actor, versionId: string) {
    this.accessPolicy.assertAdmin(actor);
    const version = await this.library.getVersion({ versionId });
    if (!version || !version.verifiedAt) throw new InvalidLibraryTransitionError("A ready version must be verified before publication");
    assertTransition(version.status, "published");
    return this.library.publishGlobalVersion({ versionId });
  }
}
