import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Button } from "./button";

describe("Button", () => {
  it("renders an accessible button label", () => {
    render(<Button>Upload rulebook</Button>);

    expect(
      screen.getByRole("button", { name: "Upload rulebook" }),
    ).toBeInTheDocument();
  });
});
