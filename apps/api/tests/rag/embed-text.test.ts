import { OllamaEmbeddings } from "@langchain/ollama";
import { OpenAIEmbeddings } from "@langchain/openai";
import { describe, expect, it } from "vitest";

import {
  createEmbeddings,
  createOllamaEmbeddings,
  createOpenAIEmbeddings,
} from "../../src/infrastructure/rag/embeddings/embed-text";

describe("createOpenAIEmbeddings", () => {
  it("configures the requested model without embedding text", () => {
    const embeddings = createOpenAIEmbeddings("text-embedding-3-small", {
      apiKey: "test-api-key",
    });

    expect(embeddings.model).toBe("text-embedding-3-small");
    expect(embeddings.modelName).toBe("text-embedding-3-small");
  });
});

describe("createOllamaEmbeddings", () => {
  it("configures the requested model and base URL without embedding text", () => {
    const embeddings = createOllamaEmbeddings(
      "nomic-embed-text",
      "http://127.0.0.1:11434",
    );

    expect(embeddings.model).toBe("nomic-embed-text");
  });
});

describe("createEmbeddings", () => {
  it("creates OpenAI embeddings for the openai provider", () => {
    const embeddings = createEmbeddings({
      provider: "openai",
      model: "text-embedding-3-small",
      openAiApiKey: "test-api-key",
    });

    expect(embeddings).toBeInstanceOf(OpenAIEmbeddings);
  });

  it("creates Ollama embeddings for the ollama provider", () => {
    const embeddings = createEmbeddings({
      provider: "ollama",
      model: "nomic-embed-text",
      ollamaBaseUrl: "http://127.0.0.1:11434",
    });

    expect(embeddings).toBeInstanceOf(OllamaEmbeddings);
  });
});
