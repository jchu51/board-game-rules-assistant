import { describe, expect, it } from "vitest";

import { InMemoryConversationRepository } from "../src/infrastructure/persistence/conversation/in-memory-conversation-repository";

describe("InMemoryConversationRepository", () => {
  it("creates empty conversations with unique UUIDs", async () => {
    const repository =
      new InMemoryConversationRepository() as InMemoryConversationRepository & {
        createConversation(): Promise<string>;
      };

    const firstId = await repository.createConversation();
    const secondId = await repository.createConversation();

    expect(firstId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(secondId).not.toBe(firstId);
    expect(await repository.getMessages(firstId)).toEqual([]);
  });

  it("lists newest conversation titles first", async () => {
    const repository = new InMemoryConversationRepository();

    const firstId = await repository.createConversation();
    const secondId = await repository.createConversation();

    expect(await repository.getChats()).toEqual([
      {
        conversationId: secondId,
        title: "New chat",
      },
      {
        conversationId: firstId,
        title: "New chat",
      },
    ]);
  });

  it("hard deletes a conversation and its messages", async () => {
    const repository = new InMemoryConversationRepository();
    const conversationId = await repository.createConversation();
    await repository.appendMessages(conversationId, [
      { role: "user", content: "hello" },
    ]);

    await expect(repository.deleteConversation(conversationId)).resolves.toBe(
      true,
    );
    await expect(repository.getChats()).resolves.toEqual([]);
    await expect(repository.getMessages(conversationId)).resolves.toEqual([]);
    await expect(repository.deleteConversation(conversationId)).resolves.toBe(
      false,
    );
  });

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
