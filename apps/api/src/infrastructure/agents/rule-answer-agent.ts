import { modelCallLimitMiddleware } from "langchain";
import { ConfigurableModel } from "langchain/chat_models/universal";

import {
  Agent,
  createLangChainAgentRuntime,
  type AgentRuntime,
} from "./agent.js";
import { AgentError } from "./agent-error.js";
import { piiRedactionMiddleware } from "./pii-redaction-middleware.js";
import { policyBackstopMiddleware } from "./policy-backstop-middleware.js";
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
      policyBackstopMiddleware(),
      modelCallLimitMiddleware({ runLimit: 3, exitBehavior: "error" }),
      ...piiRedactionMiddleware({ applyToInput: false, applyToOutput: true }),
    ]),
  ) {
    super(name);
    this.agent = agent;
    this.context = context;
  }

  async run(
    question: string,
    runtimeContext: Record<string, unknown> = {},
  ): Promise<string> {
    try {
      const messages = await boardGameRuleMasterPrompt.formatMessages({
        question,
        context: this.context,
      });

      const response = await this.agent.invoke({ messages, runtimeContext });

      return response.messages.at(-1)?.text ?? "No response";
    } catch (error) {
      console.error("error:\n", error);
      throw AgentError.runFailed(this.name, error);
    }
  }
}
