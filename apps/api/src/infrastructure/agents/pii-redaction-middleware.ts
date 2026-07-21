import { piiMiddleware, type AnyAgentMiddleware } from "langchain";

const BUILT_IN_PII_TYPES = [
  "email",
  "credit_card",
  "ip",
  "mac_address",
  "url",
] as const;

export const piiRedactionMiddleware = (options: {
  applyToInput: boolean;
  applyToOutput: boolean;
}): AnyAgentMiddleware[] =>
  BUILT_IN_PII_TYPES.map((piiType) =>
    piiMiddleware(piiType, { strategy: "redact", ...options }),
  );
