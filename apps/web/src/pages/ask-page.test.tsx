import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { searchRulebooks } = vi.hoisted(() => ({
  searchRulebooks: vi.fn(),
}));

vi.mock("@/api/retrieval-api", () => ({ searchRulebooks }));

import { AskPage } from "./ask-page";

const submitQuestion = async (question: string) => {
  const input = screen.getByRole("textbox", { name: "Ask a rules question" });
  fireEvent.change(input, { target: { value: question } });
  fireEvent.submit(screen.getByTestId("ask-empty-composer-form"));
  await act(async () => {});
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("crypto", { randomUUID: vi.fn(() => "conversation-1") });
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("AskPage", () => {
  it("preserves the empty state across a stable rerender", () => {
    const { rerender } = render(<AskPage />);

    rerender(<AskPage />);

    expect(screen.getByText("Ask the Rules Assistant")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Send question" }),
    ).toBeDisabled();
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
    render(<AskPage />);

    await submitQuestion("In Catan, how many resources does a city produce?");

    expect(searchRulebooks).toHaveBeenCalledWith({
      conversationId: "conversation-1",
      query: "In Catan, how many resources does a city produce?",
    });
    expect(screen.getByText("Catan")).toBeInTheDocument();

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
    render(<AskPage />);

    fireEvent.click(
      screen.getByRole("button", {
        name: "How does elemental infusion work in Gloomhaven?",
      }),
    );
    await act(async () => {});
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });

    expect(screen.getByText("Gloomhaven")).toBeInTheDocument();
    expect(screen.getByText(/No matching rule was found/)).toBeInTheDocument();
    expect(screen.queryByText("Sources")).not.toBeInTheDocument();
  });

  it("uses the fallback answer when an empty response has no matches", async () => {
    searchRulebooks.mockResolvedValue({ answer: "", matches: [] });
    render(<AskPage />);

    await submitQuestion("What happens next?");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });

    expect(screen.getByText(/Try uploading the rulebook/)).toBeInTheDocument();
  });

  it("renders search errors and starts a fresh chat", async () => {
    searchRulebooks.mockRejectedValue(new Error("network unavailable"));
    render(<AskPage />);

    await submitQuestion("Pandemic infection rate");

    expect(
      screen.getByText(/could not search.*network unavailable/i),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "New chat" }));
    expect(screen.getByText("Ask the Rules Assistant")).toBeInTheDocument();
    expect(screen.queryByText(/network unavailable/i)).not.toBeInTheDocument();
  });

  it("submits on Enter but allows Shift+Enter", async () => {
    searchRulebooks.mockResolvedValue({ answer: "Answer", matches: [] });
    render(<AskPage />);
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
    render(<AskPage />);
    await submitQuestion("Catan road rules");

    fireEvent.change(
      screen.getByRole("textbox", { name: "Ask a rules question" }),
      { target: { value: "A second question" } },
    );
    fireEvent.submit(screen.getByTestId("ask-chat-composer-form"));
    expect(searchRulebooks).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByRole("button", { name: "New chat" }));
    await act(async () => {
      resolveSearch?.({ answer: "Stale answer", matches: [] });
    });
    expect(screen.queryByText("Stale answer")).not.toBeInTheDocument();
    expect(screen.getByText("Ask the Rules Assistant")).toBeInTheDocument();
  });

  it("uses the fallback message for non-Error failures", async () => {
    searchRulebooks.mockRejectedValue("offline");
    render(<AskPage />);

    await submitQuestion("Root battle");

    expect(screen.getByText(/Failed to search rulebooks/)).toBeInTheDocument();
  });
});
