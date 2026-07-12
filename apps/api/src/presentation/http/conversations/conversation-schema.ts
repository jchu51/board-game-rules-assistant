import { z } from "zod";

export const CreateConversationSchema = z.object({
  gameId: z.string().uuid("gameId must be a valid UUID"),
  title: z.string().trim().min(1, "title is required").max(200),
}).strict();

export const ConversationIdSchema = z.string().uuid("conversation id must be a valid UUID");
