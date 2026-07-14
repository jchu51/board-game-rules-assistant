import { Router, type Response } from "express";
import { HttpStatus } from "../shared/http-status";
import type { TypedResponse } from "../shared/http-types";
import { HealthResponseSchema } from "./health-schema";
import type { HealthResponseBody } from "./health-types";

type HealthResponse = TypedResponse<HealthResponseBody>;

export class HealthRouter {
  readonly router: Router;

  constructor(private readonly readinessCheck: () => Promise<void>) {
    const router = Router();

    router.get("/health", (_request, response: HealthResponse) => {
      const responseBody = HealthResponseSchema.parse({
        status: "ok",
        service: "board-game-rules-assistant-api",
      });

      response.json(responseBody);
    });
    router.get("/ready", async (_request, response: Response) => {
      try {
        await this.readinessCheck();
        const responseBody = HealthResponseSchema.parse({
          status: "ok",
          service: "board-game-rules-assistant-api",
        });

        response.status(HttpStatus.OK).json(responseBody);
      } catch {
        response
          .status(HttpStatus.SERVICE_UNAVAILABLE)
          .json({ error: "Service unavailable" });
      }
    });

    this.router = router;
  }
}
