import { rm } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { extname } from "node:path";
import type {
  NextFunction,
  Request,
  RequestHandler,
  Router as ExpressRouter,
} from "express";
import { Router } from "express";
import multer, { MulterError } from "multer";
import { getErrorMessage } from "../../shared/http/get-error-message";
import { HttpStatus } from "../../shared/http/http-status";
import { InvalidSplitterParamsError } from "./ingestion-errors";
import { IngestionService } from "./ingestion-service";
import type {
  ErrorResponseBody,
  TypedResponse,
} from "../../shared/http/http-types";
import {
  UploadPdfsRequestSchema,
  UploadPdfsResponseSchema,
} from "./ingestion-schema";
import type {
  IngestionRouterOptions,
  UploadPdfsResponseBody,
} from "./ingestion-types";

type UploadPdfsResponse = TypedResponse<
  UploadPdfsResponseBody | ErrorResponseBody
>;

export class IngestionRouter {
  readonly router: ExpressRouter;
  private readonly isProduction: boolean;

  constructor(
    private readonly ingestionService: IngestionService,
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
      "/upload-pdfs",
      this.handleUpload(upload.single("file")),
      this.uploadPdfs,
    );

    this.router = router;
  }

  private sendError = (
    response: UploadPdfsResponse,
    status: HttpStatus,
    error: string,
  ) => response.status(status).json({ error });

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

      const { splitterParams } = parseResult.data;

      const result = await this.ingestionService.ingestPdf({
        filePath: request.file.path,
        splitterParams,
      });

      const responseBody = UploadPdfsResponseSchema.parse({
        ...result,
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
}
