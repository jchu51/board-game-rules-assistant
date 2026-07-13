import type { ConfigurableModel } from "langchain/chat_models/universal";

import {
  Agent,
  createLangChainAgentRuntime,
  type AgentRuntime,
} from "./agent.js";
import { AgentError } from "./agent-error.js";
import { conversationMetadataPrompt } from "../prompts/conversation-metadata-prompt.js";

export type ConversationMetadata = {
  title: string;
  game: string | null;
};

const stripJsonFence = (text: string): string =>
  text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

const parseMetadata = (text: string): ConversationMetadata => {
  const parsed: unknown = JSON.parse(stripJsonFence(text));

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new TypeError("metadata must be an object");
  }

  const { title, game } = parsed as Record<string, unknown>;
  if (typeof title !== "string" || title.trim().length === 0) {
    throw new TypeError("metadata title must be a non-empty string");
  }
  if (game !== null && typeof game !== "string") {
    throw new TypeError("metadata game must be a string or null");
  }

  const normalizedGame = game?.trim() ?? "";

  return {
    title: title.trim(),
    game:
      normalizedGame.length === 0 ||
      normalizedGame.toLowerCase() === "unknown"
        ? null
        : normalizedGame,
  };
};

export class ConversationMetadataAgent extends Agent<ConversationMetadata> {
  private readonly agent: AgentRuntime;

  constructor(
    name: string,
    model: ConfigurableModel,
    agent: AgentRuntime = createLangChainAgentRuntime(model),
  ) {
    super(name);
    this.agent = agent;
  }

  async run(question: string): Promise<ConversationMetadata> {
    try {
      const messages = await conversationMetadataPrompt.formatMessages({
        question,
      });
      const response = await this.agent.invoke({ messages });
      const text = response.messages.at(-1)?.text;

      if (!text) {
        throw new TypeError("metadata response must contain text");
      }

      return parseMetadata(text);
    } catch (error) {
      console.error("error:\n", error);
      throw AgentError.runFailed(this.name, error);
    }
  }
}
