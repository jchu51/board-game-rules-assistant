import type { BaseMessageLike } from "@langchain/core/messages";
import { createAgent, type AnyAgentMiddleware } from "langchain";
import type { ConfigurableModel } from "langchain/chat_models/universal";

export abstract class Agent<Output = string> {
  readonly name: string;

  constructor(name: string) {
    this.name = name;
  }

  abstract run(
    input: string,
    runtimeContext?: Record<string, unknown>,
  ): Promise<Output>;
}

export type AgentRuntime = {
  invoke(input: {
    messages: BaseMessageLike[];
    runtimeContext?: Record<string, unknown>;
  }): Promise<{
    messages: Array<{
      text?: string;
    }>;
  }>;
};

export const createLangChainAgentRuntime = (
  model: ConfigurableModel,
  middleware: AnyAgentMiddleware[] = [],
): AgentRuntime => {
  const agent = createAgent({ model, middleware });

  return {
    async invoke({ messages, runtimeContext }) {
      const response = await agent.invoke(
        { messages },
        { context: runtimeContext ?? {} },
      );

      return {
        messages: response.messages.map((message) => ({
          text: message.text,
        })),
      };
    },
  };
};
