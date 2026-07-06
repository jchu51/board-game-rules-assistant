import { createApp } from "./app.js";
import { config } from "./config/config.js";
import { HealthRouter } from "./modules/health/health-router.js";

const healthRouter = new HealthRouter();
const routers = [healthRouter.router];

if (config.nodeEnv === "local") {
  const { DocsRouter } = await import("./modules/docs/docs-router.js");
  const docsRouter = new DocsRouter();
  routers.push(docsRouter.router);
}

const app = createApp({ config, routers });

const server = app.listen(config.port, config.host, () => {
  console.log(`API listening on http://${config.host}:${config.port}`);
});

const shutdown = (signal: NodeJS.Signals) => {
  console.log(`${signal} received. Closing API server.`);
  server.close(() => {
    process.exit(0);
  });
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
