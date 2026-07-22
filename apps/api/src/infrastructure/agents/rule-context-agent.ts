import { ConfigurableModel } from "langchain/chat_models/universal";

import {
  Agent,
  createLangChainAgentRuntime,
  type AgentRuntime,
} from "./agent.js";
import { AgentError } from "./agent-error.js";
import { piiRedactionMiddleware } from "./pii-redaction-middleware.js";
import { ruleContextPrompt } from "./prompts/rule-context-prompt.js";

/**
 * RuleContextAgent
 * takes user question + top-k retrieved chunks
 * filters/compresses into relevant rules only
 */
export class RuleContextAgent extends Agent {
  private readonly agent: AgentRuntime;
  readonly context: string;

  constructor(
    name: string,
    model: ConfigurableModel,
    context: string,
    agent: AgentRuntime = createLangChainAgentRuntime(
      model,
      piiRedactionMiddleware({ applyToInput: true, applyToOutput: false }),
    ),
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
      const messages = await ruleContextPrompt.formatMessages({
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
