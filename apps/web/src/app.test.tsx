import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";

vi.mock("./pages/ask-page", () => ({ AskPage: () => <h1>Ask page</h1> }));
vi.mock("./pages/library-page", () => ({
  LibraryPage: () => <h1>Library page</h1>,
}));

import App from "./App";

describe("App", () => {
  it.each([
    ["/", "Ask page"],
    ["/ask", "Ask page"],
    ["/library", "Library page"],
    ["/unknown", "Ask page"],
  ])("routes %s", (route, heading) => {
    render(
      <MemoryRouter initialEntries={[route]}>
        <App />
      </MemoryRouter>,
    );
    expect(screen.getByRole("heading", { name: heading })).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Rulebook Referee/ }),
    ).toBeInTheDocument();
  });

  it("navigates with the primary menu", () => {
    const createApp = () => (
      <MemoryRouter initialEntries={["/ask"]}>
        <App />
      </MemoryRouter>
    );
    const { rerender } = render(createApp());
    rerender(createApp());
    fireEvent.click(screen.getByRole("link", { name: "Library" }));
    expect(
      screen.getByRole("heading", { name: "Library page" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("link", { name: "Ask" }));
    expect(
      screen.getByRole("heading", { name: "Ask page" }),
    ).toBeInTheDocument();
  });
});
