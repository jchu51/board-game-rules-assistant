import { describe, expect, it } from "vitest";

import { InMemoryConversationRepository } from "../src/infrastructure/persistence/conversation/in-memory-conversation-repository";

describe("InMemoryConversationRepository", () => {
  it("stores isolated conversations and retains only the configured limit", () => {
    const repository = new InMemoryConversationRepository({
      maxMessagesPerConversation: 3,
    });

    repository.appendMessages("conversation-a", [
      { role: "user", content: "first" },
      { role: "assistant", content: "second" },
    ]);
    repository.appendMessages("conversation-a", [
      { role: "user", content: "third" },
      { role: "assistant", content: "fourth" },
    ]);
    repository.appendMessages("conversation-b", [
      { role: "user", content: "separate" },
    ]);

    expect(repository.getMessages("conversation-a")).toEqual([
      { role: "assistant", content: "second" },
      { role: "user", content: "third" },
      { role: "assistant", content: "fourth" },
    ]);
    expect(repository.getMessages("conversation-b")).toEqual([
      { role: "user", content: "separate" },
    ]);
    expect(repository.getMessages("unknown")).toEqual([]);
  });

  it("returns a copy that cannot mutate stored messages", () => {
    const repository = new InMemoryConversationRepository();
    repository.appendMessages("conversation-a", [
      { role: "user", content: "original" },
    ]);

    const returnedMessages = repository.getMessages("conversation-a");
    returnedMessages[0]!.content = "changed externally";
    returnedMessages.push({
      role: "assistant",
      content: "external mutation",
    });

    expect(repository.getMessages("conversation-a")).toEqual([
      { role: "user", content: "original" },
    ]);
  });
});
