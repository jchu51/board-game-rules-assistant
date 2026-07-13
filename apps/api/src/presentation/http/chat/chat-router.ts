import type { NextFunction, Request } from "express";
import { Router } from "express";

import type { ConversationRepository } from "../../../domain/conversation/conversation-repository";
import { HttpStatus } from "../shared/http-status";
import type { TypedResponse } from "../shared/http-types";
import { CreateChatResponseSchema } from "./chat-schema";
import type { CreateChatResponseBody } from "./chat-types";

export class ChatRouter {
  readonly router: Router;

  constructor(private readonly conversationRepository: ConversationRepository) {
    const router = Router();

    router.post("/chats", this.createChat);

    this.router = router;
  }

  private createChat = async (
    _request: Request,
    response: TypedResponse<CreateChatResponseBody>,
    next: NextFunction,
  ) => {
    try {
      const conversationId =
        await this.conversationRepository.createConversation();
      const responseBody = CreateChatResponseSchema.parse({ conversationId });

      return response.status(HttpStatus.CREATED).json(responseBody);
    } catch (error) {
      next(error);
    }
  };
}
