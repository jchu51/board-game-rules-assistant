import { modelCallLimitMiddleware, piiMiddleware } from "langchain";
import { ConfigurableModel } from "langchain/chat_models/universal";

import {
  Agent,
  createLangChainAgentRuntime,
  type AgentRuntime,
} from "./agent.js";
import { AgentError } from "./agent-error.js";
import { boardGameRuleMasterPrompt } from "./prompts/board-game-rule-master-prompt.js";

/**
 * RuleAnswerAgent
 * takes user question + relevant rules
 * produces final board-game answer
 */
export class RuleAnswerAgent extends Agent {
  private readonly agent: AgentRuntime;
  readonly context: string;

  constructor(
    name: string,
    model: ConfigurableModel,
    context: string,
    agent: AgentRuntime = createLangChainAgentRuntime(model, [
      modelCallLimitMiddleware({ runLimit: 3, exitBehavior: "error" }),
      piiMiddleware("email", {
        strategy: "redact",
        applyToInput: false,
        applyToOutput: true,
      }),
      piiMiddleware("credit_card", {
        strategy: "redact",
        applyToInput: false,
        applyToOutput: true,
      }),
      piiMiddleware("ip", {
        strategy: "redact",
        applyToInput: false,
        applyToOutput: true,
      }),
      piiMiddleware("mac_address", {
        strategy: "redact",
        applyToInput: false,
        applyToOutput: true,
      }),
      piiMiddleware("url", {
        strategy: "redact",
        applyToInput: false,
        applyToOutput: true,
      }),
    ]),
  ) {
    super(name);
    this.agent = agent;
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
