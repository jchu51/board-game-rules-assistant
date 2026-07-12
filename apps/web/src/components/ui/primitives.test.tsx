import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Alert, AlertDescription, AlertTitle } from "./alert";
import { Badge } from "./badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "./empty";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "./field";
import { Input } from "./input";
import { Progress } from "./progress";
import { ToggleGroup, ToggleGroupItem } from "./toggle-group";

describe("UI primitives", () => {
  it("reuses stable primitive trees on rerender", () => {
    const onValueChange = vi.fn();
    const createTree = () => (
      <>
        <Alert>
          <AlertTitle>Cached title</AlertTitle>
          <AlertDescription>Cached description</AlertDescription>
        </Alert>
        <Badge>Cached badge</Badge>
        <Card>
          <CardHeader>
            <CardTitle>Cached card</CardTitle>
            <CardDescription>Cached card description</CardDescription>
          </CardHeader>
          <CardContent>Cached content</CardContent>
          <CardFooter>Cached footer</CardFooter>
        </Card>
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Cached empty</EmptyTitle>
            <EmptyDescription>Cached empty description</EmptyDescription>
          </EmptyHeader>
        </Empty>
        <FieldGroup>
          <Field>
            <FieldLabel>Cached label</FieldLabel>
            <FieldDescription>Cached help</FieldDescription>
            <FieldError>Cached error</FieldError>
          </Field>
        </FieldGroup>
        <Input aria-label="Cached input" />
        <Progress value={25} />
        <ToggleGroup value="one" onValueChange={onValueChange}>
          <ToggleGroupItem value="one">Cached toggle</ToggleGroupItem>
        </ToggleGroup>
      </>
    );
    const { rerender } = render(createTree());

    rerender(createTree());

    expect(screen.getByText("Cached title")).toBeInTheDocument();
  });

  it.each(["default", "destructive"] as const)(
    "renders the %s alert",
    (variant) => {
      render(
        <Alert variant={variant} className="custom-alert">
          <AlertTitle className="custom-title">Notice</AlertTitle>
          <AlertDescription className="custom-description">
            Description
          </AlertDescription>
        </Alert>,
      );
      expect(screen.getByRole("alert")).toHaveClass("custom-alert");
      expect(screen.getByText("Notice")).toBeInTheDocument();
    },
  );

  it.each(["default", "secondary", "outline", "destructive"] as const)(
    "renders the %s badge",
    (variant) => {
      render(
        <Badge variant={variant} className="custom-badge">
          {variant}
        </Badge>,
      );
      expect(screen.getByText(variant)).toHaveAttribute("data-slot", "badge");
    },
  );

  it("renders every card and empty-state slot", () => {
    const { container } = render(
      <>
        <Card className="custom-card">
          <CardHeader className="custom-card-header">
            <CardTitle className="custom-card-title">Title</CardTitle>
            <CardDescription className="custom-card-description">
              Description
            </CardDescription>
          </CardHeader>
          <CardContent className="custom-card-content">Content</CardContent>
          <CardFooter className="custom-card-footer">Footer</CardFooter>
        </Card>
        <Empty className="custom-empty">
          <EmptyHeader className="custom-empty-header">
            <EmptyTitle className="custom-empty-title">Empty title</EmptyTitle>
            <EmptyDescription className="custom-empty-description">
              Empty description
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </>,
    );

    expect(container.querySelectorAll("[data-slot]")).toHaveLength(10);
  });

  it("renders every field slot and input props", () => {
    render(
      <FieldGroup className="custom-field-group">
        <Field className="custom-field">
          <FieldLabel className="custom-label" htmlFor="name">
            Name
          </FieldLabel>
          <Input id="name" type="text" className="custom-input" />
          <FieldDescription className="custom-help">Help</FieldDescription>
          <FieldError className="custom-error">Error</FieldError>
        </Field>
      </FieldGroup>,
    );

    expect(screen.getByLabelText("Name")).toHaveClass("custom-input");
    expect(screen.getByText("Help")).toBeInTheDocument();
    expect(screen.getByText("Error")).toBeInTheDocument();
  });

  it.each([
    [undefined, "translateX(-100%)"],
    [-10, "translateX(-100%)"],
    [50, "translateX(-50%)"],
    [120, "translateX(-0%)"],
  ])("normalizes progress value %s", (value, transform) => {
    const { container } = render(
      <Progress value={value} className="custom-progress" />,
    );
    expect(
      container.querySelector('[data-slot="progress-indicator"]'),
    ).toHaveStyle({ transform });
  });

  it("toggles values and supports an item outside a group", () => {
    const onValueChange = vi.fn();
    render(
      <>
        <ToggleGroup
          value="grid"
          onValueChange={onValueChange}
          className="custom-toggle-group"
        >
          <ToggleGroupItem className="custom-grid" value="grid">
            Grid
          </ToggleGroupItem>
          <ToggleGroupItem className="custom-list" value="list">
            List
          </ToggleGroupItem>
        </ToggleGroup>
        <ToggleGroupItem className="custom-outside" value="outside">
          Outside
        </ToggleGroupItem>
      </>,
    );

    expect(screen.getByRole("button", { name: "Grid" })).toHaveAttribute(
      "data-state",
      "on",
    );
    expect(screen.getByRole("button", { name: "List" })).toHaveAttribute(
      "data-state",
      "off",
    );
    fireEvent.click(screen.getByRole("button", { name: "List" }));
    fireEvent.click(screen.getByRole("button", { name: "Outside" }));
    expect(onValueChange).toHaveBeenCalledWith("list");
  });
});
