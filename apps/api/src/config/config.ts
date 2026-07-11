import "dotenv/config";

import { EnvSchema } from "./config-schema";
import type { Config } from "./config-types";

const parseEnv = () => {
  const result = EnvSchema.safeParse(process.env);

  if (!result.success) {
    console.error("Invalid environment configuration:");
    for (const issue of result.error.issues) {
      console.error(
        `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`,
      );
    }

    process.exit(1);
  }

  return result.data;
};

const env = parseEnv();

export const config: Config = {
  nodeEnv: env.NODE_ENV,
  host: env.HOST,
  port: env.PORT,
  corsOrigin: env.CORS_ORIGIN,
  agent: {
    chatModel: env.AGENT_CHAT_MODEL,
  },
  ingestion: {
    openAiApiKey: env.OPENAI_API_KEY,
    embeddingModel: env.INGESTION_EMBEDDING_MODEL,
    embeddingDimensions: env.INGESTION_EMBEDDING_DIMENSIONS,
    defaultChunkSize: env.INGESTION_CHUNK_SIZE,
    defaultChunkOverlap: env.INGESTION_CHUNK_OVERLAP,
    uploadDirectory: env.INGESTION_UPLOAD_DIRECTORY,
    maxUploadSizeBytes: env.INGESTION_MAX_UPLOAD_SIZE_BYTES,
  },
  persistence: {
    driver: env.PERSISTENCE_DRIVER,
    databaseUrl: env.DATABASE_URL,
  },
  localUserId: env.LOCAL_USER_ID,
  publicSearch: {
    tavilyApiKey: env.TAVILY_API_KEY,
    includeDomains: env.PUBLIC_SEARCH_INCLUDE_DOMAINS?.split(",")
      .map((domain) => domain.trim())
      .filter(Boolean),
  },
};
