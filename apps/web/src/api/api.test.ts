import { afterEach, describe, expect, it, vi } from "vitest";

import { searchRulebooks } from "./retrieval-api";
import { createChat } from "./chat-service";
import {
  deleteRulebook,
  listRulebooks,
  uploadRulebookPdf,
} from "./rulebook-api";

const response = (body: unknown, ok = true) =>
  ({
    ok,
    json: vi.fn().mockResolvedValue(body),
  }) as unknown as Response;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("web API clients", () => {
  it("creates a chat without a request body", async () => {
    const body = {
      conversationId: "11111111-1111-4111-8111-111111111111",
    };
    const fetchMock = vi.fn().mockResolvedValue(response(body));
    vi.stubGlobal("fetch", fetchMock);

    await expect(createChat()).resolves.toEqual(body);
    expect(fetchMock).toHaveBeenCalledWith(expect.stringMatching(/\/chats$/), {
      method: "POST",
    });
  });

  it("uploads, lists, and deletes rulebooks", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response({ id: "uploaded" }))
      .mockResolvedValueOnce(response({ rulebooks: [] }))
      .mockResolvedValueOnce(response(undefined));
    vi.stubGlobal("fetch", fetchMock);
    const file = new File(["pdf"], "catan.pdf", {
      type: "application/pdf",
    });

    await expect(
      uploadRulebookPdf({ file, gameName: "Catan" }),
    ).resolves.toEqual({ id: "uploaded" });
    await expect(listRulebooks()).resolves.toEqual({ rulebooks: [] });
    await expect(deleteRulebook("document/id")).resolves.toBeUndefined();

    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      method: "POST",
      body: expect.any(FormData),
    });
    expect(fetchMock.mock.calls[2]?.[0]).toMatch(/document\/id$/);
  });

  it("searches rulebooks", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(response({ answer: "Answer", matches: [] }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      searchRulebooks({ conversationId: "conversation", query: "question" }),
    ).resolves.toEqual({ answer: "Answer", matches: [] });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/retrieval\/search$/),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          conversationId: "conversation",
          query: "question",
        }),
      }),
    );
  });

  it.each([
    [
      "upload",
      () =>
        uploadRulebookPdf({ file: new File(["x"], "x.pdf"), gameName: "X" }),
    ],
    ["list", () => listRulebooks()],
    ["delete", () => deleteRulebook("missing")],
    ["search", () => searchRulebooks({ conversationId: "c", query: "q" })],
    ["create chat", () => createChat()],
  ])("surfaces the API error for %s", async (_name, request) => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(response({ error: "API failed" }, false)),
    );

    await expect(request()).rejects.toThrow("API failed");
  });

  it.each([
    [
      "upload",
      () =>
        uploadRulebookPdf({ file: new File(["x"], "x.pdf"), gameName: "X" }),
    ],
    ["list", () => listRulebooks()],
    ["delete", () => deleteRulebook("missing")],
    ["search", () => searchRulebooks({ conversationId: "c", query: "q" })],
    ["create chat", () => createChat()],
  ])(
    "uses the fallback when %s has no readable error",
    async (_name, request) => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: false,
          json: vi.fn().mockRejectedValue(new Error("invalid JSON")),
        }),
      );

      await expect(request()).rejects.toThrow(/Failed to/);
    },
  );
});
