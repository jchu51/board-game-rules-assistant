import type { EmbeddingsInterface } from "@langchain/core/embeddings";
import { OllamaEmbeddings } from "@langchain/ollama";
import {
  type ClientOptions,
  type OpenAIEmbeddingModelId,
  OpenAIEmbeddings,
} from "@langchain/openai";

export type EmbeddingProvider = "openai" | "ollama";

export type CreateEmbeddingsOptions = {
  provider: EmbeddingProvider;
  model: string;
  openAiApiKey?: string;
  ollamaBaseUrl?: string;
};

export const createOpenAIEmbeddings = (
  model: OpenAIEmbeddingModelId = "text-embedding-3-large",
  config?: ClientOptions,
): OpenAIEmbeddings<number[]> => {
  return new OpenAIEmbeddings({
    model: model,
    configuration: config,
  });
};

export const createOllamaEmbeddings = (
  model = "nomic-embed-text",
  baseUrl = "http://127.0.0.1:11434",
): OllamaEmbeddings => {
  return new OllamaEmbeddings({
    model,
    baseUrl,
  });
};

export const createEmbeddings = ({
  provider,
  model,
  openAiApiKey,
  ollamaBaseUrl,
}: CreateEmbeddingsOptions): EmbeddingsInterface => {
  if (provider === "ollama") {
    return createOllamaEmbeddings(model, ollamaBaseUrl);
  }

  return createOpenAIEmbeddings(model, { apiKey: openAiApiKey });
};
