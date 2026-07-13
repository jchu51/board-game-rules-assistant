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
    game: z.string().nullable(),
  })
  .strict();

export const GetChatsResponseSchema = z
  .object({
    chats: z.array(ChatSummarySchema),
  })
  .strict();

export const ChatMessageSchema = z
  .object({
    role: z.enum(["user", "assistant"]),
    content: z.string(),
  })
  .strict();

export const GetChatResponseSchema = ChatSummarySchema.extend({
  messages: z.array(ChatMessageSchema),
}).strict();
