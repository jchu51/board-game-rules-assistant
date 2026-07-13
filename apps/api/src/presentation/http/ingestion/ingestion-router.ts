import { readFile, rm } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { extname } from "node:path";
import type { NextFunction, Request, RequestHandler, Response } from "express";
import { Router } from "express";
import multer, { MulterError } from "multer";
import { IngestionService } from "../../../application/ingestion/ingestion-service";
import { InvalidSplitterParamsError } from "../../../domain/ingestion/ingestion-errors";
import type { RulebookRepository } from "../../../domain/rulebook/rulebook-repository";
import { getErrorMessage } from "../shared/get-error-message";
import { HttpStatus } from "../shared/http-status";
import type { ErrorResponseBody, TypedResponse } from "../shared/http-types";
import {
  ListRulebooksResponseSchema,
  UploadPdfsRequestSchema,
  UploadPdfsResponseSchema,
} from "./ingestion-schema";
import type {
  IngestionRouterOptions,
  ListRulebooksResponseBody,
  UploadPdfsResponseBody,
} from "./ingestion-types";

type UploadPdfsResponse = TypedResponse<
  UploadPdfsResponseBody | ErrorResponseBody
>;
type ListRulebooksResponse = TypedResponse<ListRulebooksResponseBody>;
type DeleteRulebookResponse = TypedResponse<ErrorResponseBody | undefined>;

export class IngestionRouter {
  readonly router: Router;
  private readonly isProduction: boolean;

  constructor(
    private readonly ingestionService: IngestionService,
    private readonly rulebookRepository: RulebookRepository,
    {
      uploadDirectory,
      maxUploadSizeBytes,
      isProduction,
    }: IngestionRouterOptions,
  ) {
    this.isProduction = isProduction;

    const upload = multer({
      storage: multer.diskStorage({
        destination: uploadDirectory,
        filename: (_request, _file, callback) => {
          callback(null, `${randomUUID()}.pdf`);
        },
      }),
      limits: { fileSize: maxUploadSizeBytes },
      fileFilter: (_request, file, callback) => {
        const hasPdfExtension =
          extname(file.originalname).toLowerCase() === ".pdf";
        const hasPdfMimeType = file.mimetype === "application/pdf";

        if (!hasPdfExtension || !hasPdfMimeType) {
          callback(new Error("Only PDF files are allowed"));
          return;
        }

        callback(null, true);
      },
    });

    const router = Router();

    router.post(
      "/rulebooks",
      this.handleUpload(upload.single("file")),
      this.uploadPdfs,
    );
    router.get("/rulebooks", this.listRulebooks);
    router.delete("/rulebooks/:id", this.deleteRulebook);

    this.router = router;
  }

  private sendError = (response: Response, status: HttpStatus, error: string) =>
    response.status(status).json({ error });

  private handleUpload =
    (middleware: RequestHandler) =>
    (request: Request, response: UploadPdfsResponse, next: NextFunction) => {
      middleware(request, response, (error: unknown) => {
        if (error instanceof MulterError && error.code === "LIMIT_FILE_SIZE") {
          this.sendError(
            response,
            HttpStatus.PAYLOAD_TOO_LARGE,
            "File exceeds the upload size limit",
          );
          return;
        }

        if (error) {
          this.sendError(
            response,
            HttpStatus.BAD_REQUEST,
            this.isProduction
              ? "Upload failed"
              : getErrorMessage(error, "Upload failed"),
          );
          return;
        }

        next();
      });
    };

  private uploadPdfs = async (
    request: Request,
    response: UploadPdfsResponse,
    next: NextFunction,
  ) => {
    if (!request.file) {
      return this.sendError(
        response,
        HttpStatus.BAD_REQUEST,
        "file is required",
      );
    }

    try {
      const parseResult = UploadPdfsRequestSchema.safeParse(request.body);

      if (!parseResult.success) {
        return this.sendError(
          response,
          HttpStatus.BAD_REQUEST,
          parseResult.error.issues[0]?.message ?? "Invalid request body",
        );
      }

      const { gameName, splitterParams } = parseResult.data;
      const id = randomUUID();
      const pdfName = request.file.originalname;
      const fileSize = request.file.size;

      const result = await this.ingestionService.ingestPdf({
        filePath: request.file.path,
        metadata: {
          documentId: id,
        },
        source: pdfName,
        splitterParams,
      });

      const pdfData = await readFile(request.file.path);
      await this.rulebookRepository.save({
        id,
        gameName,
        pdfName,
        mimeType: request.file.mimetype,
        fileSize,
        pdfData,
      });

      const responseBody = UploadPdfsResponseSchema.parse({
        ...result,
        id,
        gameName,
        pdfName,
        fileSize,
        status: "completed",
      });

      return response.status(HttpStatus.OK).json(responseBody);
    } catch (error) {
      if (error instanceof InvalidSplitterParamsError) {
        return this.sendError(response, HttpStatus.BAD_REQUEST, error.message);
      }

      next(error);
    } finally {
      await rm(request.file.path, { force: true });
    }
  };

  private listRulebooks = async (
    _request: Request,
    response: ListRulebooksResponse,
    next: NextFunction,
  ) => {
    try {
      const responseBody = ListRulebooksResponseSchema.parse({
        rulebooks: await this.rulebookRepository.list(),
      });

      return response.status(HttpStatus.OK).json(responseBody);
    } catch (error) {
      return next(error);
    }
  };

  private deleteRulebook = (
    request: Request<{ id: string }>,
    response: DeleteRulebookResponse,
  ) => {
    const deleted = this.rulebookRepository.deleteById(request.params.id);

    if (!deleted) {
      return this.sendError(
        response,
        HttpStatus.NOT_FOUND,
        "Rulebook not found",
      );
    }

    return response.status(HttpStatus.NO_CONTENT).send();
  };
}
