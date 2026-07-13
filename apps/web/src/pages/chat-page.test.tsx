import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { createChat, searchRulebooks } = vi.hoisted(() => ({
  createChat: vi.fn(),
  searchRulebooks: vi.fn(),
}));

vi.mock("@/api/retrieval-api", () => ({ searchRulebooks }));
vi.mock("@/api/chat-service", () => ({ createChat }));

import { ChatPage } from "./chat-page";

const renderChatPage = () =>
  render(
    <MemoryRouter initialEntries={["/chat"]}>
      <ChatPage />
    </MemoryRouter>,
  );

const renderCreatedChatPage = async () => {
  const result = renderChatPage();
  fireEvent.click(screen.getByTestId("ask-new-chat-btn"));
  await act(async () => {});
  return result;
};

const submitQuestion = async (question: string) => {
  const input = screen.getByRole("textbox", { name: "Ask a rules question" });
  fireEvent.change(input, { target: { value: question } });
  fireEvent.submit(screen.getByTestId("ask-empty-composer-form"));
  await act(async () => {});
};

beforeEach(() => {
  vi.useFakeTimers();
  createChat.mockResolvedValue({
    conversationId: "conversation-1",
  });
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("ChatPage", () => {
  it("starts clean without creating a chat", () => {
    const { rerender } = renderChatPage();

    rerender(
      <MemoryRouter>
        <ChatPage />
      </MemoryRouter>,
    );

    expect(createChat).not.toHaveBeenCalled();
    expect(screen.queryByText("Ask the Referee")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("textbox", { name: "Ask a rules question" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("Catan - road through settlement"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/No chats match/)).not.toBeInTheDocument();
    expect(screen.getByTestId("mobile-chat-menu-btn")).toBeInTheDocument();
    expect(screen.getByText("Chat")).toBeInTheDocument();
  });

  it("uses the reference navigation labels", () => {
    renderChatPage();

    expect(screen.getByRole("link", { name: "Ask" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Library" })).toBeInTheDocument();
  });

  it("opens and closes the mobile chat navigation", () => {
    renderChatPage();

    fireEvent.click(screen.getByTestId("mobile-chat-menu-btn"));
    expect(
      screen.getByRole("dialog", { name: "Chat navigation" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("mobile-chat-close-btn"));
    expect(
      screen.queryByRole("dialog", { name: "Chat navigation" }),
    ).not.toBeInTheDocument();
  });

  it("closes the mobile chat navigation with Escape and the backdrop", () => {
    renderChatPage();
    const menuButton = screen.getByTestId("mobile-chat-menu-btn");

    fireEvent.click(menuButton);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(menuButton).toHaveFocus();

    fireEvent.click(menuButton);
    fireEvent.click(screen.getByTestId("mobile-chat-backdrop-btn"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("creates and activates a chat from the drawer action", async () => {
    renderChatPage();

    fireEvent.click(screen.getByTestId("mobile-chat-menu-btn"));
    fireEvent.click(screen.getByTestId("mobile-new-chat-btn"));
    await act(async () => {});

    expect(createChat).toHaveBeenCalledOnce();
    expect(screen.getByText("Ask the Referee")).toBeInTheDocument();
  });

  it("closes mobile navigation after selecting a conversation", async () => {
    await renderCreatedChatPage();
    fireEvent.click(screen.getByTestId("mobile-chat-menu-btn"));

    fireEvent.click(
      screen.getByTestId("mobile-chat-select-conversation-1-btn"),
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("creates and activates a server chat from the button", async () => {
    await renderCreatedChatPage();

    expect(createChat).toHaveBeenCalledOnce();
    expect(screen.getByText("Ask the Referee")).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", { name: "Ask a rules question" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("New chat").length).toBeGreaterThan(0);
  });

  it("prevents duplicate creates while pending", async () => {
    createChat.mockReturnValue(new Promise(() => {}));
    renderChatPage();
    const button = screen.getByTestId("ask-new-chat-btn");
    fireEvent.click(button);
    fireEvent.click(button);

    expect(button).toBeDisabled();
    expect(createChat).toHaveBeenCalledOnce();
  });

  it("keeps the clean state and shows create errors", async () => {
    createChat.mockRejectedValue(new Error("creation unavailable"));
    renderChatPage();
    fireEvent.click(screen.getByTestId("ask-new-chat-btn"));
    await act(async () => {});

    expect(screen.getByRole("alert")).toHaveTextContent("creation unavailable");
    expect(screen.getByTestId("mobile-chat-menu-btn")).toBeInTheDocument();
    expect(
      screen.queryByRole("textbox", { name: "Ask a rules question" }),
    ).not.toBeInTheDocument();
  });

  it("returns to the clean state after deleting the final chat", async () => {
    await renderCreatedChatPage();

    fireEvent.click(screen.getByRole("button", { name: "Delete New chat" }));

    expect(createChat).toHaveBeenCalledOnce();
    expect(screen.queryByText("Ask the Referee")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("textbox", { name: "Ask a rules question" }),
    ).not.toBeInTheDocument();
  });

  it("searches, streams an answer, and renders citations", async () => {
    searchRulebooks.mockResolvedValue({
      answer: "A city produces two resources.",
      matches: [
        {
          origin: "rulebook",
          content: `  Cities\nproduce   two resources. ${"x".repeat(450)}`,
          metadata: {
            source: "catan.pdf",
            pageNumber: 8,
          },
        },
        {
          origin: "public_web",
          content: "Official FAQ",
          metadata: {},
        },
      ],
    });
    await renderCreatedChatPage();

    await submitQuestion("In Catan, how many resources does a city produce?");

    expect(searchRulebooks).toHaveBeenCalledWith({
      conversationId: "conversation-1",
      query: "In Catan, how many resources does a city produce?",
    });
    expect(screen.getAllByText("Catan")[0]).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });

    expect(
      screen.getByText(/A city produces two resources/),
    ).toBeInTheDocument();
    expect(screen.getByText("catan.pdf")).toBeInTheDocument();
    expect(screen.getByText(/p\. 8/)).toBeInTheDocument();
    expect(screen.getByText("Indexed rulebook")).toBeInTheDocument();
    expect(
      screen.getAllByText(/Cities produce two resources/)[0],
    ).toBeInTheDocument();
  });

  it("shows the provided not-found answer without sources", async () => {
    searchRulebooks.mockResolvedValue({
      answer: "No matching rule was found.",
      matches: [],
    });
    await renderCreatedChatPage();

    fireEvent.click(
      screen.getByRole("button", {
        name: "How does elemental infusion work in Gloomhaven?",
      }),
    );
    await act(async () => {});
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });

    expect(screen.getAllByText("Gloomhaven")[0]).toBeInTheDocument();
    expect(screen.getByText(/No matching rule was found/)).toBeInTheDocument();
    expect(
      screen.getByText(/Rulebook citations for the latest answer/),
    ).toBeInTheDocument();
  });

  it("uses the fallback answer when an empty response has no matches", async () => {
    searchRulebooks.mockResolvedValue({ answer: "", matches: [] });
    await renderCreatedChatPage();

    await submitQuestion("What happens next?");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });

    expect(screen.getByText(/Try uploading the rulebook/)).toBeInTheDocument();
  });

  it("renders search errors and starts a fresh chat", async () => {
    searchRulebooks.mockRejectedValue(new Error("network unavailable"));
    await renderCreatedChatPage();

    await submitQuestion("Pandemic infection rate");

    expect(
      screen.getByText(/could not search.*network unavailable/i),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("ask-new-chat-btn"));
    await act(async () => {});
    expect(screen.getByText("Ask the Referee")).toBeInTheDocument();
    expect(screen.queryByText(/network unavailable/i)).not.toBeInTheDocument();
  });

  it("submits on Enter but allows Shift+Enter", async () => {
    searchRulebooks.mockResolvedValue({ answer: "Answer", matches: [] });
    await renderCreatedChatPage();
    const input = screen.getByRole("textbox", { name: "Ask a rules question" });
    fireEvent.change(input, { target: { value: "Azul scoring" } });

    fireEvent.keyDown(input, { key: "Enter", shiftKey: true });
    expect(searchRulebooks).not.toHaveBeenCalled();
    fireEvent.keyDown(input, { key: "Enter", shiftKey: false });
    await act(async () => {});

    expect(searchRulebooks).toHaveBeenCalledOnce();
  });

  it("ignores concurrent and stale search results after a new chat", async () => {
    let resolveSearch:
      ((value: { answer: string; matches: never[] }) => void) | undefined;
    searchRulebooks.mockReturnValue(
      new Promise((resolve) => {
        resolveSearch = resolve;
      }),
    );
    await renderCreatedChatPage();
    await submitQuestion("Catan road rules");

    fireEvent.change(
      screen.getByRole("textbox", { name: "Ask a rules question" }),
      { target: { value: "A second question" } },
    );
    fireEvent.submit(screen.getByTestId("ask-chat-composer-form"));
    expect(searchRulebooks).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByTestId("ask-new-chat-btn"));
    await act(async () => {
      resolveSearch?.({ answer: "Stale answer", matches: [] });
    });
    expect(screen.queryByText("Stale answer")).not.toBeInTheDocument();
    expect(screen.getByText("Ask the Referee")).toBeInTheDocument();
  });

  it("uses the fallback message for non-Error failures", async () => {
    searchRulebooks.mockRejectedValue("offline");
    await renderCreatedChatPage();

    await submitQuestion("Root battle");

    expect(screen.getByText(/Failed to search rulebooks/)).toBeInTheDocument();
  });
});
