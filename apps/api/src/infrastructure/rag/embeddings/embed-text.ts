import {
  type ClientOptions,
  type OpenAIEmbeddingModelId,
  OpenAIEmbeddings,
} from "@langchain/openai";

export const createOpenAIEmbeddings = (
  model: OpenAIEmbeddingModelId = "text-embedding-3-large",
  config?: ClientOptions,
): OpenAIEmbeddings<number[]> => {
  return new OpenAIEmbeddings({
    model: model,
    configuration: config,
  });
};
