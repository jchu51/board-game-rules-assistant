import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BookIcon } from "./book-icon";

describe("SVG icons", () => {
  it("renders and reuses the book icon", () => {
    const { container, rerender } = render(<BookIcon stroke="currentColor" />);

    rerender(<BookIcon stroke="currentColor" />);

    expect(container.querySelector("path")).toHaveAttribute(
      "stroke",
      "currentColor",
    );
  });
});
