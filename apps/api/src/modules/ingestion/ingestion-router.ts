import express, { type NextFunction, type Response, Router } from "express";
import { HttpStatus } from "../../shared/http/http-status.js";
import {
  IngestionFileTooLargeError,
  InvalidIngestionFilePathError,
} from "./ingestion-errors.js";
import { IngestionService } from "./ingestion-service.js";
import type { TypedRequestBody } from "../../shared/http/http-types.js";
import {
  UploadPdfsRequestSchema,
  UploadPdfsResponseSchema,
} from "./ingestion-types.js";

type UploadPdfsRequest = TypedRequestBody<unknown>;

export class IngestionRouter {
  readonly router: Router;

  constructor(private readonly ingestionService: IngestionService) {
    const router = Router();
    router.use(express.json());

    router.post("/upload-pdfs", this.uploadPdfs);

    this.router = router;
  }

  private uploadPdfs = async (
    request: UploadPdfsRequest,
    response: Response,
    next: NextFunction,
  ) => {
    try {
      const parseResult = UploadPdfsRequestSchema.safeParse(request.body);

      if (!parseResult.success) {
        return response.status(HttpStatus.BAD_REQUEST).json({
          error: parseResult.error.issues[0]?.message ?? "Invalid request body",
        });
      }

      const { filePath, splitterParams } = parseResult.data;

      const result = await this.ingestionService.ingestPdf({
        filePath,
        splitterParams,
      });

      const responseBody = UploadPdfsResponseSchema.parse({
        ...result,
        status: "completed",
      });

      return response.status(HttpStatus.OK).json(responseBody);
    } catch (error) {
      if (error instanceof InvalidIngestionFilePathError) {
        return response.status(HttpStatus.BAD_REQUEST).json({
          error: "filePath must be a PDF inside the upload directory",
        });
      }

      if (error instanceof IngestionFileTooLargeError) {
        return response.status(HttpStatus.PAYLOAD_TOO_LARGE).json({
          error: `File is ${error.fileSizeBytes} bytes, exceeding the ${error.maxSizeBytes}-byte limit`,
        });
      }

      next(error);
    }
  };
}
