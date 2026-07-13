import { createOpenAIEmbeddings } from "@board-game-rules-assistant/rag-core";
import {
  ConversationTitleAgent,
  LLMService,
  RuleAnswerAgent,
  RuleContextAgent,
} from "@board-game-rules-assistant/agent-core";

import { IngestionService } from "./application/ingestion/ingestion-service";
import { RequestClassifierService } from "./application/retrieval/request-classifier-service";
import { RetrievalService } from "./application/retrieval/retrieval-service";
import { config } from "./config/config";
import { createPersistence } from "./infrastructure/persistence/create-persistence";
import { TavilyPublicSearchService } from "./infrastructure/public-search/tavily-public-search-service";
import { createApp } from "./presentation/http/app";
import { ChatRouter } from "./presentation/http/chat/chat-router";
import { HealthRouter } from "./presentation/http/health/health-router";
import { IngestionRouter } from "./presentation/http/ingestion/ingestion-router";
import { RetrievalRouter } from "./presentation/http/retrieval/retrieval-router";

// Services
const embeddings = createOpenAIEmbeddings(config.ingestion.embeddingModel, {
  apiKey: config.ingestion.openAiApiKey,
});
const persistence = await createPersistence({ config, embeddings });
await persistence.healthCheck();
const llmService = new LLMService();
const chatModel = await llmService.init(config.agent.chatModel, {
  apiKey: config.ingestion.openAiApiKey,
  temperature: 0,
});
const vectorStore = persistence.vectorStore;
const rulebookRepository = persistence.rulebookRepository;
const conversationRepository = persistence.conversationRepository;
const ingestionService = new IngestionService(vectorStore, {
  defaultSplitterParams: {
    chunkSize: config.ingestion.defaultChunkSize,
    chunkOverlap: config.ingestion.defaultChunkOverlap,
  },
});
const requestClassifier = new RequestClassifierService();
const publicSearchService = new TavilyPublicSearchService({
  apiKey: config.publicSearch.tavilyApiKey,
  includeDomains: config.publicSearch.includeDomains,
});
const retrievalService = new RetrievalService(
  vectorStore,
  requestClassifier,
  publicSearchService,
  conversationRepository,
  (context) => new RuleContextAgent("rule-context-agent", chatModel, context),
  (context) => new RuleAnswerAgent("rule-answer-agent", chatModel, context),
  () => new ConversationTitleAgent("conversation-title-agent", chatModel),
);

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
const chatRouter = new ChatRouter(conversationRepository);
const routers = [
  healthRouter.router,
  chatRouter.router,
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

let shutdownPromise: Promise<void> | undefined;

const shutdown = (signal: NodeJS.Signals) => {
  shutdownPromise ??= (async () => {
    console.log(`${signal} received. Closing API server.`);
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    await persistence.close();
  })();

  void shutdownPromise.then(
    () => process.exit(0),
    (error) => {
      console.error("Failed to close API cleanly:", error);
      process.exit(1);
    },
  );
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
