import type { BaseMessage } from "@langchain/core/messages";
import { createMiddleware, type AnyAgentMiddleware } from "langchain";

import { includesTerm } from "../../shared/helpers.js";

const INJECTION_PHRASES = [
  "ignore previous instructions",
  "ignore all previous instructions",
  "ignore the above",
  "disregard previous instructions",
  "disregard the above",
  "forget everything above",
  "override your instructions",
  "developer mode",
  "reveal your instructions",
  "reveal your system prompt",
  "jailbreak",
  "you are no longer bound",
  "act as an unrestricted",
];

export const promptInjectionScanMiddleware = (): AnyAgentMiddleware =>
  createMiddleware({
    name: "PromptInjectionScan",
    beforeModel: (state) => {
      const matchedPhrase = INJECTION_PHRASES.find((phrase) =>
        state.messages.some((message: BaseMessage) =>
          includesTerm(message.text ?? "", phrase),
        ),
      );

      if (matchedPhrase) {
        throw new Error(
          `retrieved content matched a prompt-injection pattern: "${matchedPhrase}"`,
        );
      }
    },
  });
