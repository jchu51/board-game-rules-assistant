import { rm } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { Router } from "express";
import multer from "multer";
import type { LibraryService } from "../../../application/library/library-service";
import type { ActorService } from "../../../application/auth/actor-service";
import { createActorMiddleware } from "../middleware/actor-middleware";
import { HttpStatus } from "../shared/http-status";
import { CreateGlobalDocumentRequestSchema, CreateGlobalDocumentResponseSchema, GlobalVersionResponseSchema } from "./admin-library-schema";

export class AdminLibraryRouter {
  readonly router: Router;
  constructor(private readonly service: LibraryService, actorService: ActorService, options: { uploadDirectory: string; maxUploadSizeBytes: number }) {
    const upload = multer({ storage: multer.diskStorage({ destination: options.uploadDirectory, filename: (_request, _file, callback) => callback(null, `${randomUUID()}.pdf`) }), limits: { fileSize: options.maxUploadSizeBytes } });
    const router = Router();
    router.use(createActorMiddleware(actorService));
    router.post("/admin/games/:gameId/documents", upload.single("file"), this.createDocument);
    router.post("/admin/document-versions/:id/verify", this.verifyVersion);
    router.post("/admin/document-versions/:id/publish", this.publishVersion);
    this.router = router;
  }

  private createDocument = async (request: Request<{ gameId: string }>, response: Response, next: NextFunction) => {
    if (!request.file) return response.status(HttpStatus.BAD_REQUEST).json({ code: "INVALID_REQUEST" });
    try {
      const parsed = CreateGlobalDocumentRequestSchema.safeParse(request.body);
      if (!parsed.success) return response.status(HttpStatus.BAD_REQUEST).json({ code: "INVALID_REQUEST" });
      const result = await this.service.createGlobalDraft({ actor: response.locals.actor, gameId: request.params.gameId, filePath: request.file.path, pdfName: request.file.originalname, fileSize: request.file.size, ...parsed.data });
      return response.status(HttpStatus.OK).json(CreateGlobalDocumentResponseSchema.parse(result));
    } catch (error) { next(error); }
    finally { await rm(request.file.path, { force: true }); }
  };

  private verifyVersion = async (request: Request<{ id: string }>, response: Response, next: NextFunction) => {
    try { return response.status(HttpStatus.OK).json(GlobalVersionResponseSchema.parse(await this.service.verifyGlobalVersion(response.locals.actor, request.params.id))); }
    catch (error) { next(error); }
  };

  private publishVersion = async (request: Request<{ id: string }>, response: Response, next: NextFunction) => {
    try { return response.status(HttpStatus.OK).json(GlobalVersionResponseSchema.parse(await this.service.publishGlobalVersion(response.locals.actor, request.params.id))); }
    catch (error) { next(error); }
  };
}
