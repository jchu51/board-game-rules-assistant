import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";

vi.mock("./pages/chat-page", () => ({
  ChatPage: () => (
    <>
      <h1>Chat page</h1>
      <a href="/library">Library</a>
    </>
  ),
}));
vi.mock("./pages/library-page", () => ({
  LibraryPage: () => <h1>Library page</h1>,
}));

import App from "./App";

describe("App", () => {
  it.each([
    ["/", "Chat page"],
    ["/chat", "Chat page"],
    ["/ask", "Chat page"],
    ["/library", "Library page"],
    ["/unknown", "Chat page"],
  ])("routes %s", (route, heading) => {
    render(
      <MemoryRouter initialEntries={[route]}>
        <App />
      </MemoryRouter>,
    );
    expect(screen.getByRole("heading", { name: heading })).toBeInTheDocument();
    if (route === "/library") {
      expect(
        screen.getByRole("navigation", { name: "Sections" }),
      ).toBeInTheDocument();
    }
  });

  it("navigates with the primary menu", () => {
    const createApp = () => (
      <MemoryRouter initialEntries={["/library"]}>
        <App />
      </MemoryRouter>
    );
    const { rerender } = render(createApp());
    rerender(createApp());
    expect(
      screen.getByRole("heading", { name: "Library page" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("link", { name: "Ask" }));
    expect(
      screen.getByRole("heading", { name: "Chat page" }),
    ).toBeInTheDocument();
  });
});
