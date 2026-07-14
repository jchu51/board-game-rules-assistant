import type { BaseMessageLike } from "@langchain/core/messages";
import { createAgent } from "langchain";
import type { ConfigurableModel } from "langchain/chat_models/universal";

export abstract class Agent<Output = string> {
  readonly name: string;

  constructor(name: string) {
    this.name = name;
  }

  abstract run(input: string): Promise<Output>;
}

export type AgentRuntime = {
  invoke(input: { messages: BaseMessageLike[] }): Promise<{
    messages: Array<{
      text?: string;
    }>;
  }>;
};

export const createLangChainAgentRuntime = (
  model: ConfigurableModel,
): AgentRuntime => {
  const agent = createAgent({ model });

  return {
    async invoke({ messages }) {
      const response = await agent.invoke({ messages });

      return {
        messages: response.messages.map((message) => ({
          text: message.text,
        })),
      };
    },
  };
};
