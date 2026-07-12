import { expect, it } from "vitest";

import type { ConversationRepositoryLike } from "../src/conversation/conversation-types.js";

type RepositoryFixture = {
  repository: ConversationRepositoryLike;
  dispose(): Promise<void>;
};

export const runConversationRepositoryContract = (
  createFixture: () => Promise<RepositoryFixture>,
) => {
  it("stores isolated conversations in message order", async () => {
    const { repository, dispose } = await createFixture();
    try {
      await repository.appendMessages("conversation-a", [
        { role: "user", content: "first" },
        { role: "assistant", content: "second" },
      ]);
      await repository.appendMessages("conversation-b", [
        { role: "user", content: "separate" },
      ]);

      expect(await repository.getMessages("conversation-a")).toEqual([
        { role: "user", content: "first" },
        { role: "assistant", content: "second" },
      ]);
      expect(await repository.getMessages("conversation-b")).toEqual([
        { role: "user", content: "separate" },
      ]);
      expect(await repository.getMessages("unknown")).toEqual([]);
    } finally {
      await dispose();
    }
  });

  it("retains only the configured number of newest messages", async () => {
    const { repository, dispose } = await createFixture();
    try {
      await repository.appendMessages("conversation-a", [
        { role: "user", content: "first" },
        { role: "assistant", content: "second" },
        { role: "user", content: "third" },
        { role: "assistant", content: "fourth" },
      ]);

      expect(await repository.getMessages("conversation-a")).toEqual([
        { role: "assistant", content: "second" },
        { role: "user", content: "third" },
        { role: "assistant", content: "fourth" },
      ]);
    } finally {
      await dispose();
    }
  });

  it("returns values that cannot mutate persisted messages", async () => {
    const { repository, dispose } = await createFixture();
    try {
      await repository.appendMessages("conversation-a", [
        { role: "user", content: "original" },
      ]);
      const messages = await repository.getMessages("conversation-a");
      messages[0]!.content = "changed";

      expect(await repository.getMessages("conversation-a")).toEqual([
        { role: "user", content: "original" },
      ]);
    } finally {
      await dispose();
    }
  });
};
