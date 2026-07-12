import { describe, expect, it } from "vitest";

import { InMemoryConversationRepository } from "../src/infrastructure/persistence/conversation/in-memory-conversation-repository";

describe("InMemoryConversationRepository", () => {
  it("exposes an asynchronous contract", async () => {
    const repository = new InMemoryConversationRepository();

    const appendResult = repository.appendMessages("conversation-a", [
      { role: "user", content: "hello" },
    ]);
    const readResult = repository.getMessages("conversation-a");

    expect(appendResult).toBeInstanceOf(Promise);
    expect(readResult).toBeInstanceOf(Promise);
    await appendResult;
    await readResult;
  });

  it("stores isolated conversations and retains only the configured limit", async () => {
    const repository = new InMemoryConversationRepository({
      maxMessagesPerConversation: 3,
    });

    await repository.appendMessages("conversation-a", [
      { role: "user", content: "first" },
      { role: "assistant", content: "second" },
    ]);
    await repository.appendMessages("conversation-a", [
      { role: "user", content: "third" },
      { role: "assistant", content: "fourth" },
    ]);
    await repository.appendMessages("conversation-b", [
      { role: "user", content: "separate" },
    ]);

    expect(await repository.getMessages("conversation-a")).toEqual([
      { role: "assistant", content: "second" },
      { role: "user", content: "third" },
      { role: "assistant", content: "fourth" },
    ]);
    expect(await repository.getMessages("conversation-b")).toEqual([
      { role: "user", content: "separate" },
    ]);
    expect(await repository.getMessages("unknown")).toEqual([]);
  });

  it("returns a copy that cannot mutate stored messages", async () => {
    const repository = new InMemoryConversationRepository();
    await repository.appendMessages("conversation-a", [
      { role: "user", content: "original" },
    ]);

    const returnedMessages = await repository.getMessages("conversation-a");
    returnedMessages[0]!.content = "changed externally";
    returnedMessages.push({
      role: "assistant",
      content: "external mutation",
    });

    expect(await repository.getMessages("conversation-a")).toEqual([
      { role: "user", content: "original" },
    ]);
  });
});
