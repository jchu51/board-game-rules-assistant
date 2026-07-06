import cors from "cors";
import express, { type Router } from "express";
import type { Config } from "./config/config.js";
import { errorMiddleware } from "./shared/http/error-middleware.js";

type CreateAppOptions = {
  config: Config;
  routers: Router[];
};

export const createApp = ({ config, routers }: CreateAppOptions) => {
  const app = express();

  app.use(
    cors({
      origin: config.corsOrigin,
    }),
  );
  app.use(express.json());

  for (const router of routers) {
    app.use(router);
  }

  app.use(errorMiddleware);

  return app;
};
