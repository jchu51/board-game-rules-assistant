import cors from "cors";
import express from "express";

import { config } from "./config/config.js";

export const createApp = () => {
  const app = express();

  app.use(
    cors({
      origin: config.corsOrigin,
    }),
  );
  app.use(express.json());

  app.get("/health", (_request, response) => {
    response.json({
      status: "ok",
      service: "board-game-rules-assistant-api",
    });
  });

  return app;
};
