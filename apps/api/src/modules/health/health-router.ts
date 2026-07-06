import express, { Router } from "express";
import { z } from "zod";

const HealthResponseSchema = z.object({
  status: z.literal("ok"),
  service: z.literal("board-game-rules-assistant-api"),
});

export class HealthRouter {
  readonly router: Router;

  constructor() {
    const router = Router();
    router.use(express.json());

    router.get("/health", (_request, response) => {
      const responseBody = HealthResponseSchema.parse({
        status: "ok",
        service: "board-game-rules-assistant-api",
      });

      response.json(responseBody);
    });

    this.router = router;
  }
}
