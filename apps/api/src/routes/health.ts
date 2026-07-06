import express, { Router } from "express";

export class HealthRouter {
  readonly router: Router;

  constructor() {
    const router = Router();
    router.use(express.json());

    router.get("/health", (_request, response) => {
      response.json({
        status: "ok",
        service: "board-game-rules-assistant-api",
      });
    });

    this.router = router;
  }
}
