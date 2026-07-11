import assert from "node:assert/strict";
import { describe, it } from "node:test";

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

    assert.deepEqual(repository.getMessages("conversation-a"), [
      { role: "assistant", content: "second" },
      { role: "user", content: "third" },
      { role: "assistant", content: "fourth" },
    ]);
    assert.deepEqual(repository.getMessages("conversation-b"), [
      { role: "user", content: "separate" },
    ]);
    assert.deepEqual(repository.getMessages("unknown"), []);
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

    assert.deepEqual(repository.getMessages("conversation-a"), [
      { role: "user", content: "original" },
    ]);
  });
});
