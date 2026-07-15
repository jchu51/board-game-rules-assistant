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
    OPENAI_API_KEY: z.preprocess(
      emptyToUndefined,
      z.string().min(1).optional(),
    ),
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
    EMBEDDING_PROVIDER: z
      .preprocess(emptyToUndefined, z.enum(["openai", "ollama"]))
      .default("openai"),
    OLLAMA_BASE_URL: withDefault("http://127.0.0.1:11434"),
    INGESTION_EMBEDDING_MODEL: z.preprocess(
      emptyToUndefined,
      z.string().min(1).optional(),
    ),
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
    DATABASE_URL: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
    PERSISTENCE_MAX_MESSAGES: numberWithDefault(20).pipe(
      z.number().int().positive(),
    ),
  })
  .superRefine((env, context) => {
    const usesOpenAi =
      env.EMBEDDING_PROVIDER === "openai" ||
      env.AGENT_CHAT_MODEL.startsWith("openai:");
    if (usesOpenAi && !env.OPENAI_API_KEY) {
      context.addIssue({
        code: "custom",
        path: ["OPENAI_API_KEY"],
        message:
          "OPENAI_API_KEY is required when the embedding provider or chat model uses OpenAI - set it in apps/api/.env",
      });
    }

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
