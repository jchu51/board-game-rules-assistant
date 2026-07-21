import { piiMiddleware } from "langchain";
import { ConfigurableModel } from "langchain/chat_models/universal";

import {
  Agent,
  createLangChainAgentRuntime,
  type AgentRuntime,
} from "./agent.js";
import { AgentError } from "./agent-error.js";
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
    agent: AgentRuntime = createLangChainAgentRuntime(model, [
      piiMiddleware("email", { strategy: "redact" }),
      piiMiddleware("credit_card", { strategy: "redact" }),
      piiMiddleware("ip", { strategy: "redact" }),
      piiMiddleware("mac_address", { strategy: "redact" }),
      piiMiddleware("url", { strategy: "redact" }),
    ]),
  ) {
    super(name);
    this.agent = agent;
    this.context = context;
  }

  async run(question: string): Promise<string> {
    try {
      const messages = await ruleContextPrompt.formatMessages({
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
