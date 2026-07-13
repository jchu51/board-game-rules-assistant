import { z } from "zod";

export const CreateChatResponseSchema = z
  .object({
    conversationId: z.string().uuid(),
  })
  .strict();

export const ChatSummarySchema = z
  .object({
    conversationId: z.string().uuid(),
    title: z.string().min(1),
  })
  .strict();

export const GetChatsResponseSchema = z
  .object({
    chats: z.array(ChatSummarySchema),
  })
  .strict();
