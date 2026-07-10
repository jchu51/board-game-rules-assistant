import {
  createOpenAIEmbeddings,
  LangchainMemoryVectorStore,
} from "@board-game-rules-assistant/rag-core";
import {
  LLMService,
  RuleAnswerAgent,
  RuleContextAgent,
} from "@board-game-rules-assistant/agent-core";

import { IngestionService } from "./application/ingestion/ingestion-service";
import { RetrievalService } from "./application/retrieval/retrieval-service";
import { config } from "./config/config";
import { InMemoryRulebookRepository } from "./infrastructure/persistence/rulebook/in-memory-rulebook-repository";
import { createApp } from "./presentation/http/app";
import { HealthRouter } from "./presentation/http/health/health-router";
import { IngestionRouter } from "./presentation/http/ingestion/ingestion-router";
import { RetrievalRouter } from "./presentation/http/retrieval/retrieval-router";

// Services
const embeddings = createOpenAIEmbeddings(config.ingestion.embeddingModel, {
  apiKey: config.ingestion.openAiApiKey,
});
const llmService = new LLMService();
const chatModel = await llmService.init(config.agent.chatModel, {
  apiKey: config.ingestion.openAiApiKey,
  temperature: 0,
});
const vectorStore = new LangchainMemoryVectorStore(embeddings);
const rulebookRepository = new InMemoryRulebookRepository();
const ingestionService = new IngestionService(vectorStore, {
  defaultSplitterParams: {
    chunkSize: config.ingestion.defaultChunkSize,
    chunkOverlap: config.ingestion.defaultChunkOverlap,
  },
});
const retrievalService = new RetrievalService(vectorStore, {
  createRuleAnswerAgent: (context) =>
    new RuleAnswerAgent("rule-answer-agent", chatModel, context),
  createRuleContextAgent: (context) =>
    new RuleContextAgent("rule-context-agent", chatModel, context),
});

// Routers
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
  const { DocsRouter } = await import("./presentation/http/docs/docs-router");
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
