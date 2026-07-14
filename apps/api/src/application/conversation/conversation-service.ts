import type {
  Conversation,
  ConversationDetail,
  ConversationSummary,
} from "../../domain/conversation/conversation";
import type { ConversationRepository } from "../../domain/conversation/conversation-repository";

export class ConversationService {
  constructor(
    private readonly conversationRepository: ConversationRepository,
  ) {}

  async createConversation(): Promise<Conversation["id"]> {
    return this.conversationRepository.createConversation();
  }

  async getChats(): Promise<ConversationSummary[]> {
    return this.conversationRepository.getChats();
  }

  async getChat(
    conversationId: Conversation["id"],
  ): Promise<ConversationDetail | null> {
    return this.conversationRepository.getChat(conversationId);
  }

  async deleteConversation(
    conversationId: Conversation["id"],
  ): Promise<boolean> {
    return this.conversationRepository.deleteConversation(conversationId);
  }
}
