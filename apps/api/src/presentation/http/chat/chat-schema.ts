import { z } from "zod";

export const CreateChatResponseSchema = z
  .object({
    conversationId: z.string().uuid(),
  })
  .strict();
