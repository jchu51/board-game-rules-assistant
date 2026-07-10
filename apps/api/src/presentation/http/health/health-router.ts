import { Router } from "express";
import type { TypedResponse } from "../shared/http-types";
import { HealthResponseSchema } from "./health-schema";
import type { HealthResponseBody } from "./health-types";

type HealthResponse = TypedResponse<HealthResponseBody>;

export class HealthRouter {
  readonly router: Router;

  constructor() {
    const router = Router();

    router.get("/health", (_request, response: HealthResponse) => {
      const responseBody = HealthResponseSchema.parse({
        status: "ok",
        service: "board-game-rules-assistant-api",
      });

      response.json(responseBody);
    });

    this.router = router;
  }
}
