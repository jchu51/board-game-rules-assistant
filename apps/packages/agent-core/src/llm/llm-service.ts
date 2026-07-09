import { initChatModel } from "langchain";

export type LLMServiceInitOptions = {
  apiKey?: string;
  temperature?: number;
  timeout?: number;
  maxTokens?: number;
  maxRetries?: number;
};

export class LLMService {
  async init(modelId: string, options: LLMServiceInitOptions = {}) {
    return initChatModel(modelId, {
      apiKey: options.apiKey,
      temperature: options.temperature ?? 0.7,
      timeout: options.timeout,
      maxTokens: options.maxTokens ?? 10000,
      maxRetries: options.maxRetries ?? 6,
    });
  }
}
