import { createMiddleware, type AnyAgentMiddleware } from "langchain";
import { z } from "zod";

export const policyBackstopMiddleware = (): AnyAgentMiddleware =>
  createMiddleware({
    name: "PolicyBackstop",
    contextSchema: z.object({
      policyApproved: z.boolean().default(false),
    }),
    beforeAgent: (_state, runtime) => {
      if (!runtime.context.policyApproved) {
        throw new Error(
          "agent invocation is missing application policy approval",
        );
      }
    },
  });
