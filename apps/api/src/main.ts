import {
  createOpenAIEmbeddings,
} from "@board-game-rules-assistant/rag-core";
import { createPersistence } from "@board-game-rules-assistant/database";
import {
  LLMService,
  RuleAnswerAgent,
  RuleContextAgent,
} from "@board-game-rules-assistant/agent-core";

import { IngestionService } from "./application/ingestion/ingestion-service";
import { RulebookService } from "./application/ingestion/rulebook-service";
import { ActorService } from "./application/auth/actor-service";
import { AccessPolicyService } from "./application/access/access-policy-service";
import { preparePersistence, closePersistenceAfterServer } from "./application/runtime/persistence-lifecycle";
import { RequestClassifierService } from "./application/retrieval/request-classifier-service";
import { RetrievalService } from "./application/retrieval/retrieval-service";
import { config } from "./config/config";
import { TavilyPublicSearchService } from "./infrastructure/public-search/tavily-public-search-service";
import { createApp } from "./presentation/http/app";
import { HealthRouter } from "./presentation/http/health/health-router";
import { IngestionRouter } from "./presentation/http/ingestion/ingestion-router";
import { RetrievalRouter } from "./presentation/http/retrieval/retrieval-router";
import { LibraryService } from "./application/library/library-service";
import { AdminLibraryRouter } from "./presentation/http/admin/admin-library-router";
import { ConversationService } from "./application/conversations/conversation-service";
import { ConversationRouter } from "./presentation/http/conversations/conversation-router";

// Services
const embeddings = createOpenAIEmbeddings(config.ingestion.embeddingModel, {
  apiKey: config.ingestion.openAiApiKey,
});
const llmService = new LLMService();
const chatModel = await llmService.init(config.agent.chatModel, {
  apiKey: config.ingestion.openAiApiKey,
  temperature: 0,
});
const persistence = await createPersistence({
  driver: config.persistence.driver,
  nodeEnv: config.nodeEnv,
  databaseUrl: config.persistence.databaseUrl,
  embeddings,
  expectedDimensions: config.ingestion.embeddingDimensions,
});
await preparePersistence(persistence, config.nodeEnv, config.localUserId);
const actorService = new ActorService(persistence.identity, { nodeEnv: config.nodeEnv, localUserId: config.localUserId });
const accessPolicyService = new AccessPolicyService(persistence.policies, persistence.library);
const conversationService = new ConversationService(persistence.conversations);
const vectorStore = persistence.vectorStore;
const conversationRepository = persistence.conversations;
const ingestionService = new IngestionService(vectorStore, {
  defaultSplitterParams: {
    chunkSize: config.ingestion.defaultChunkSize,
    chunkOverlap: config.ingestion.defaultChunkOverlap,
  },
});
const rulebookService = new RulebookService(persistence.library, accessPolicyService, ingestionService, {
  embeddingModel: config.ingestion.embeddingModel,
  embeddingDimensions: config.ingestion.embeddingDimensions,
});
const libraryService = new LibraryService(persistence.library, accessPolicyService, ingestionService, {
  embeddingModel: config.ingestion.embeddingModel,
  embeddingDimensions: config.ingestion.embeddingDimensions,
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
  accessPolicyService,
);

// Routers
const healthRouter = new HealthRouter();
const ingestionRouter = new IngestionRouter(
  rulebookService,
  actorService,
  {
    uploadDirectory: config.ingestion.uploadDirectory,
    maxUploadSizeBytes: config.ingestion.maxUploadSizeBytes,
    isProduction: config.nodeEnv === "production",
  },
);
const retrievalRouter = new RetrievalRouter(retrievalService, actorService);
const adminLibraryRouter = new AdminLibraryRouter(libraryService, actorService, {
  uploadDirectory: config.ingestion.uploadDirectory,
  maxUploadSizeBytes: config.ingestion.maxUploadSizeBytes,
});
const conversationRouter = new ConversationRouter(conversationService, actorService);
const routers = [
  healthRouter.router,
  ingestionRouter.router,
  retrievalRouter.router,
  adminLibraryRouter.router,
  conversationRouter.router,
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

let isShuttingDown = false;
const shutdown = async (signal: NodeJS.Signals) => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`${signal} received. Closing API server.`);
  try { await closePersistenceAfterServer(server, persistence); }
  catch (error) { console.error("Failed to close API:", error); process.exitCode = 1; }
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
