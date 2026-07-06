import "dotenv/config";
import { z } from "zod";

export type NodeEnv = "local" | "development" | "test" | "production";

export type Config = {
  nodeEnv: NodeEnv;
  host: string;
  port: number;
  corsOrigin: string;
  ingestion: {
    openAiApiKey: string;
    embeddingModel: string;
    defaultChunkSize: number;
    defaultChunkOverlap: number;
    uploadDirectory: string;
    maxUploadSizeBytes: number;
  };
};

const emptyToUndefined = (value: unknown) => (value === "" ? undefined : value);

const withDefault = (fallback: string) =>
  z.preprocess(
    (value) => emptyToUndefined(value) ?? fallback,
    z.string().min(1),
  );

const numberWithDefault = (fallback: number) =>
  z
    .preprocess(
      (value) => (emptyToUndefined(value) === undefined ? fallback : value),
      z.coerce.number(),
    )
    .pipe(z.number());

const EnvSchema = z.object({
  NODE_ENV: z
    .preprocess(
      emptyToUndefined,
      z.enum(["local", "development", "test", "production"]),
    )
    .catch("local"),
  HOST: withDefault("127.0.0.1"),
  PORT: numberWithDefault(8000).pipe(z.number().int().min(0).max(65535)),
  CORS_ORIGIN: withDefault("http://localhost:5173"),
  OPENAI_API_KEY: z
    .string({
      message:
        "OPENAI_API_KEY is required (used by rag-core's embeddings client) — set it in apps/api/.env",
    })
    .min(1, "OPENAI_API_KEY must not be empty"),
  INGESTION_EMBEDDING_MODEL: withDefault("text-embedding-3-large"),
  INGESTION_CHUNK_SIZE: numberWithDefault(500).pipe(
    z.number().int().positive(),
  ),
  INGESTION_CHUNK_OVERLAP: numberWithDefault(100).pipe(
    z.number().int().nonnegative(),
  ),
  INGESTION_UPLOAD_DIRECTORY: withDefault("../../storage/uploads"),
  INGESTION_MAX_UPLOAD_SIZE_BYTES: numberWithDefault(20 * 1024 * 1024).pipe(
    z.number().int().positive(),
  ),
});

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
  ingestion: {
    openAiApiKey: env.OPENAI_API_KEY,
    embeddingModel: env.INGESTION_EMBEDDING_MODEL,
    defaultChunkSize: env.INGESTION_CHUNK_SIZE,
    defaultChunkOverlap: env.INGESTION_CHUNK_OVERLAP,
    uploadDirectory: env.INGESTION_UPLOAD_DIRECTORY,
    maxUploadSizeBytes: env.INGESTION_MAX_UPLOAD_SIZE_BYTES,
  },
};
