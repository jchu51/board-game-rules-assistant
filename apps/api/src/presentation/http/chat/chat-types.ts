import type { z } from "zod";

import type {
  CreateChatResponseSchema,
  GetChatResponseSchema,
  GetChatsResponseSchema,
} from "./chat-schema";

export type CreateChatResponseBody = z.infer<typeof CreateChatResponseSchema>;

export type GetChatResponseBody = z.infer<typeof GetChatResponseSchema>;

export type GetChatsResponseBody = z.infer<typeof GetChatsResponseSchema>;
