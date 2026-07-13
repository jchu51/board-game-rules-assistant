import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ConversationGroup } from "./conversation-group";

const conversation = {
  id: "catan",
  title: "Catan roads",
  game: "Catan",
  messages: [],
};

describe("ConversationGroup", () => {
  it("selects a conversation", () => {
    const onSelect = vi.fn();
    render(
      <ConversationGroup
        activeId="other"
        conversations={[conversation]}
        dotColor="#fff"
        label="Catan"
        onDelete={vi.fn()}
        onSelect={onSelect}
      />,
    );
    fireEvent.click(screen.getByTestId("chat-select-catan-btn"));
    expect(onSelect).toHaveBeenCalledWith("catan");
  });

  it("deletes without selecting the conversation", () => {
    const onDelete = vi.fn();
    const onSelect = vi.fn();
    render(
      <ConversationGroup
        activeId="catan"
        conversations={[conversation]}
        dotColor="#fff"
        label="Catan"
        onDelete={onDelete}
        onSelect={onSelect}
      />,
    );
    fireEvent.click(screen.getByTestId("chat-delete-catan-btn"));
    expect(onDelete).toHaveBeenCalledWith("catan");
    expect(onSelect).not.toHaveBeenCalled();
  });
});
