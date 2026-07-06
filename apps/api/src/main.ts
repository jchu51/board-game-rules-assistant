import {
  createOpenAIEmbeddings,
  LangchainMemoryVectorStore,
} from "@board-game-rules-assistant/rag-core";

import { createApp } from "./app.js";
import { config } from "./config/config.js";
import { HealthRouter } from "./modules/health/health-router.js";
import { IngestionRouter } from "./modules/ingestion/ingestion-router.js";
import { IngestionService } from "./modules/ingestion/ingestion-service.js";

// Services
const embeddings = createOpenAIEmbeddings(config.ingestion.embeddingModel, {
  apiKey: config.ingestion.openAiApiKey,
});
const vectorStore = new LangchainMemoryVectorStore(embeddings);
const ingestionService = new IngestionService(vectorStore, {
  defaultSplitterParams: {
    chunkSize: config.ingestion.defaultChunkSize,
    chunkOverlap: config.ingestion.defaultChunkOverlap,
  },
  uploadDirectory: config.ingestion.uploadDirectory,
  maxUploadSizeBytes: config.ingestion.maxUploadSizeBytes,
});

//Routers
const healthRouter = new HealthRouter();
const ingestionRouter = new IngestionRouter(ingestionService);
const routers = [healthRouter.router, ingestionRouter.router];

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
