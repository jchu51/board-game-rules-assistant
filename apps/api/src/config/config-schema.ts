import { z } from "zod";

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

export const EnvSchema = z
  .object({
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
        "OPENAI_API_KEY is required (used by rag-core's embeddings client) - set it in apps/api/.env",
    })
    .min(1, "OPENAI_API_KEY must not be empty"),
  TAVILY_API_KEY: z
    .string({
      message:
        "TAVILY_API_KEY is required (used by the Tavily public-search service) - set it in apps/api/.env",
    })
    .min(1, "TAVILY_API_KEY must not be empty"),
  PUBLIC_SEARCH_INCLUDE_DOMAINS: z.preprocess(
    emptyToUndefined,
    z.string().min(1).optional(),
  ),
  AGENT_CHAT_MODEL: withDefault("openai:gpt-4o-mini"),
  INGESTION_EMBEDDING_MODEL: withDefault("text-embedding-3-large"),
  INGESTION_CHUNK_SIZE: numberWithDefault(500).pipe(
    z.number().int().positive(),
  ),
  INGESTION_CHUNK_OVERLAP: numberWithDefault(100).pipe(
    z.number().int().nonnegative(),
  ),
  INGESTION_UPLOAD_DIRECTORY: withDefault("../../storage/uploads"),
  INGESTION_MAX_UPLOAD_SIZE_BYTES: numberWithDefault(40 * 1024 * 1024).pipe(
    z.number().int().positive(),
  ),
    PERSISTENCE_DRIVER: z
      .preprocess(emptyToUndefined, z.enum(["memory", "postgres"]))
      .default("memory"),
    DATABASE_URL: z.preprocess(
      emptyToUndefined,
      z.string().min(1).optional(),
    ),
    PERSISTENCE_MAX_MESSAGES: numberWithDefault(20).pipe(
      z.number().int().positive(),
    ),
  })
  .superRefine((env, context) => {
    if (env.PERSISTENCE_DRIVER === "postgres" && !env.DATABASE_URL) {
      context.addIssue({
        code: "custom",
        path: ["DATABASE_URL"],
        message: "DATABASE_URL is required for PostgreSQL persistence",
      });
    }

    if (env.NODE_ENV === "production" && env.PERSISTENCE_DRIVER === "memory") {
      context.addIssue({
        code: "custom",
        path: ["PERSISTENCE_DRIVER"],
        message: "Memory persistence is not allowed in production",
      });
    }
  });

export type Env = z.infer<typeof EnvSchema>;
