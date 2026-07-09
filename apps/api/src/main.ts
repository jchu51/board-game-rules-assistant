import {
  createOpenAIEmbeddings,
  LangchainMemoryVectorStore,
} from "@board-game-rules-assistant/rag-core";

import { createApp } from "./app";
import { config } from "./config/config";
import { InMemoryRulebookRepository } from "./db/rulebook-repository/in-memory-rulebook-repository";
import { HealthRouter } from "./modules/health/health-router";
import { IngestionRouter } from "./modules/ingestion/ingestion-router";
import { IngestionService } from "./modules/ingestion/ingestion-service";
import { RetrievalRouter } from "./modules/retrieval/retrieval-router";
import { RetrievalService } from "./modules/retrieval/retrieval-service";

// Services
const embeddings = createOpenAIEmbeddings(config.ingestion.embeddingModel, {
  apiKey: config.ingestion.openAiApiKey,
});
const vectorStore = new LangchainMemoryVectorStore(embeddings);
const rulebookRepository = new InMemoryRulebookRepository();
const ingestionService = new IngestionService(vectorStore, {
  defaultSplitterParams: {
    chunkSize: config.ingestion.defaultChunkSize,
    chunkOverlap: config.ingestion.defaultChunkOverlap,
  },
});
const retrievalService = new RetrievalService(vectorStore);

//Routers
const healthRouter = new HealthRouter();
const ingestionRouter = new IngestionRouter(
  ingestionService,
  rulebookRepository,
  {
    uploadDirectory: config.ingestion.uploadDirectory,
    maxUploadSizeBytes: config.ingestion.maxUploadSizeBytes,
    isProduction: config.nodeEnv === "production",
  },
);
const retrievalRouter = new RetrievalRouter(retrievalService);
const routers = [
  healthRouter.router,
  ingestionRouter.router,
  retrievalRouter.router,
];

if (config.nodeEnv === "local") {
  const { DocsRouter } = await import("./modules/docs/docs-router");
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
