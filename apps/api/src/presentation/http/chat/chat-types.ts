import type { z } from "zod";

import type {
  CreateChatResponseSchema,
  GetChatsResponseSchema,
} from "./chat-schema";

export type CreateChatResponseBody = z.infer<typeof CreateChatResponseSchema>;

export type GetChatsResponseBody = z.infer<typeof GetChatsResponseSchema>;
