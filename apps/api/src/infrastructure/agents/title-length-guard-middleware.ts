import { createMiddleware, type AnyAgentMiddleware } from "langchain";

const MAX_TITLE_RESPONSE_LENGTH = 200;

export const titleLengthGuardMiddleware = (): AnyAgentMiddleware =>
  createMiddleware({
    name: "TitleLengthGuard",
    afterModel: (state) => {
      const text = state.messages.at(-1)?.text ?? "";

      if (text.length > MAX_TITLE_RESPONSE_LENGTH) {
        throw new Error(
          `title response exceeds ${MAX_TITLE_RESPONSE_LENGTH} characters (${text.length})`,
        );
      }
    },
  });
