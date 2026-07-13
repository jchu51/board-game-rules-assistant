import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ConversationList } from "./conversation-list";

const conversation = {
  id: "catan",
  title: "Catan roads",
  game: "Catan",
  messages: [],
};

describe("ConversationList", () => {
  it("renders rows without a group heading and selects a conversation", () => {
    const onSelect = vi.fn();
    render(
      <ConversationList
        activeId="other"
        conversations={[conversation]}
        onDelete={vi.fn()}
        onSelect={onSelect}
      />,
    );

    expect(
      screen.queryByText("Catan", { exact: true }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("chat-select-catan-btn"));
    expect(onSelect).toHaveBeenCalledWith("catan");
  });

  it("deletes without selecting the conversation", () => {
    const onDelete = vi.fn();
    const onSelect = vi.fn();
    render(
      <ConversationList
        activeId="catan"
        conversations={[conversation]}
        onDelete={onDelete}
        onSelect={onSelect}
      />,
    );

    fireEvent.click(screen.getByTestId("chat-delete-catan-btn"));
    expect(onDelete).toHaveBeenCalledWith("catan");
    expect(onSelect).not.toHaveBeenCalled();
  });
});
