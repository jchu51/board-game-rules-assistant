export class ConversationNotFoundError extends Error {
  constructor(readonly conversationId: string) {
    super(`Conversation not found: ${conversationId}`);
    this.name = "ConversationNotFoundError";
  }
}
