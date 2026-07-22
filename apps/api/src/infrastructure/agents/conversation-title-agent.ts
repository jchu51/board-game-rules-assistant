import type { ConfigurableModel } from "langchain/chat_models/universal";

import {
  Agent,
  createLangChainAgentRuntime,
  type AgentRuntime,
} from "./agent.js";
import { AgentError } from "./agent-error.js";
import { piiRedactionMiddleware } from "./pii-redaction-middleware.js";
import { conversationTitlePrompt } from "./prompts/conversation-title-prompt.js";
import { titleLengthGuardMiddleware } from "./title-length-guard-middleware.js";

const stripJsonFence = (text: string): string =>
  text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

const parseTitle = (text: string): string => {
  const parsed: unknown = JSON.parse(stripJsonFence(text));

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new TypeError("title response must be an object");
  }

  const keys = Object.keys(parsed);
  const { title } = parsed as Record<string, unknown>;
  if (
    keys.length !== 1 ||
    keys[0] !== "title" ||
    typeof title !== "string" ||
    title.trim().length === 0
  ) {
    throw new TypeError("title response must contain only a non-empty title");
  }

  return title.trim();
};

export class ConversationTitleAgent extends Agent {
  private readonly agent: AgentRuntime;

  constructor(
    name: string,
    model: ConfigurableModel,
    agent: AgentRuntime = createLangChainAgentRuntime(model, [
      ...piiRedactionMiddleware({ applyToInput: true, applyToOutput: true }),
      titleLengthGuardMiddleware(),
    ]),
  ) {
    super(name);
    this.agent = agent;
  }

  async run(
    question: string,
    runtimeContext: Record<string, unknown> = {},
  ): Promise<string> {
    try {
      const messages = await conversationTitlePrompt.formatMessages({
        question,
      });
      const response = await this.agent.invoke({ messages, runtimeContext });
      const text = response.messages.at(-1)?.text;

      if (!text) {
        throw new TypeError("title response must contain text");
      }

      return parseTitle(text);
    } catch (error) {
      console.error("error:\n", error);
      throw AgentError.runFailed(this.name, error);
    }
  }
}
