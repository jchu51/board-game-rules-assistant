import type { NextFunction, Request } from "express";
import { Router } from "express";

import type { ConversationService } from "../../../application/conversation/conversation-service";
import { HttpStatus } from "../shared/http-status";
import type { ErrorResponseBody, TypedResponse } from "../shared/http-types";
import {
  CreateChatResponseSchema,
  GetChatResponseSchema,
  GetChatsResponseSchema,
} from "./chat-schema";
import type {
  CreateChatResponseBody,
  GetChatResponseBody,
  GetChatsResponseBody,
} from "./chat-types";

export class ChatRouter {
  readonly router: Router;

  constructor(private readonly conversationService: ConversationService) {
    const router = Router();

    router.post("/chats", this.createChat);
    router.get("/chats", this.getChats);
    router.get("/chats/:id", this.getChat);
    router.delete("/chats/:id", this.deleteChat);

    this.router = router;
  }

  private createChat = async (
    _request: Request,
    response: TypedResponse<CreateChatResponseBody>,
    next: NextFunction,
  ) => {
    try {
      const conversationId =
        await this.conversationService.createConversation();
      const responseBody = CreateChatResponseSchema.parse({ conversationId });

      return response.status(HttpStatus.CREATED).json(responseBody);
    } catch (error) {
      next(error);
    }
  };

  private getChats = async (
    _request: Request,
    response: TypedResponse<GetChatsResponseBody>,
    next: NextFunction,
  ) => {
    try {
      const chats = await this.conversationService.getChats();
      const responseBody = GetChatsResponseSchema.parse({ chats });

      return response.status(HttpStatus.OK).json(responseBody);
    } catch (error) {
      next(error);
    }
  };

  private getChat = async (
    request: Request<{ id: string }>,
    response: TypedResponse<GetChatResponseBody | ErrorResponseBody>,
    next: NextFunction,
  ) => {
    try {
      const chat = await this.conversationService.getChat(request.params.id);

      if (!chat) {
        return response
          .status(HttpStatus.NOT_FOUND)
          .json({ error: "Chat not found" });
      }

      return response
        .status(HttpStatus.OK)
        .json(GetChatResponseSchema.parse(chat));
    } catch (error) {
      next(error);
    }
  };

  private deleteChat = async (
    request: Request<{ id: string }>,
    response: TypedResponse<ErrorResponseBody | undefined>,
    next: NextFunction,
  ) => {
    try {
      const deleted = await this.conversationService.deleteConversation(
        request.params.id,
      );

      if (!deleted) {
        return response
          .status(HttpStatus.NOT_FOUND)
          .json({ error: "Chat not found" });
      }

      return response.status(HttpStatus.NO_CONTENT).send();
    } catch (error) {
      next(error);
    }
  };
}
