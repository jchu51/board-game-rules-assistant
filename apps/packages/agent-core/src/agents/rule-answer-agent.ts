import { createAgent } from "langchain";
import { ConfigurableModel } from "langchain/chat_models/universal";

import { Agent } from "./agent.js";
import { AgentError } from "./agent-error.js";
import { boardGameRuleMasterPrompt } from "../prompts/board-game-rule-master-prompt.js";

/**
 * RuleAnswerAgent
 * takes user question + relevant rules
 * produces final board-game answer
 */
export class RuleAnswerAgent extends Agent {
  private readonly agent: ReturnType<typeof createAgent>;
  readonly context: string;

  constructor(name: string, model: ConfigurableModel, context: string) {
    super(name);
    this.agent = createAgent({ model });
    this.context = context;
  }

  async run(question: string): Promise<string> {
    try {
      const messages = await boardGameRuleMasterPrompt.formatMessages({
        question,
        context: this.context,
      });

      const response = await this.agent.invoke({ messages });

      return response.messages.at(-1)?.text ?? "No response";
    } catch (error) {
      console.error("error:\n", error);
      throw AgentError.runFailed(this.name, error);
    }
  }
}
