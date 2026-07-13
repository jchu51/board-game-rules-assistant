import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Composer } from "./composer";

const renderComposer = (
  overrides: Partial<Parameters<typeof Composer>[0]> = {},
) => {
  const props = {
    idPrefix: "test",
    input: "Question",
    placeholder: "Ask",
    helperText: "Helper",
    isSubmitting: false,
    onInputChange: vi.fn(),
    onSend: vi.fn(),
    ...overrides,
  };
  render(<Composer {...props} />);
  return props;
};

describe("Composer", () => {
  it("submits a non-empty question", () => {
    const { onSend } = renderComposer();
    fireEvent.submit(screen.getByTestId("test-composer-form"));
    expect(onSend).toHaveBeenCalledOnce();
  });

  it("submits on Enter but not Shift+Enter", () => {
    const { onSend } = renderComposer();
    const input = screen.getByRole("textbox", { name: "Ask a rules question" });
    fireEvent.keyDown(input, { key: "Enter", shiftKey: true });
    expect(onSend).not.toHaveBeenCalled();
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onSend).toHaveBeenCalledOnce();
  });

  it("disables sending while empty or submitting", () => {
    const { rerender } = render(
      <Composer
        idPrefix="test"
        input=""
        placeholder="Ask"
        helperText="Helper"
        isSubmitting={false}
        onInputChange={vi.fn()}
        onSend={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Send question" }),
    ).toBeDisabled();
    rerender(
      <Composer
        idPrefix="test"
        input="Question"
        placeholder="Ask"
        helperText="Helper"
        isSubmitting
        onInputChange={vi.fn()}
        onSend={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Searching rulebooks" }),
    ).toBeDisabled();
  });
});
