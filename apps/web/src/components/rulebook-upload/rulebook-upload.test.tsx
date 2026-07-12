import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { RulebookDocument } from "@/domain/rulebook";

import { DocumentCard } from "./document-card";
import { Dropzone } from "./dropzone";
import { formatSize } from "./format-size";
import { SelectedFileCard } from "./selected-file-card";
import { StatusBadge } from "./status-badge";

const createDocument = (
  overrides: Partial<RulebookDocument> = {},
): RulebookDocument => ({
  id: "catan/rules",
  gameName: "Catan",
  pdfName: "catan.pdf",
  size: 2 * 1024 * 1024,
  isPersisted: true,
  status: "ready",
  pages: 12,
  progress: 100,
  ...overrides,
});

describe("rulebook upload components", () => {
  it.each([
    [undefined, ""],
    [100, "100 B"],
    [2048, "2 KB"],
    [2 * 1024 * 1024, "2.0 MB"],
  ])("formats %s bytes", (bytes, expected) => {
    expect(formatSize(bytes)).toBe(expected);
  });

  it.each([
    ["ready", "Ready"],
    ["processing", "Indexing"],
    ["error", "Failed"],
  ] as const)("renders the %s status", (status, label) => {
    render(<StatusBadge status={status} />);

    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it("renders a ready document and removes it", () => {
    const onRemove = vi.fn();
    const onRetry = vi.fn();
    const document = createDocument();
    const { rerender } = render(
      <DocumentCard
        document={document}
        onRemove={onRemove}
        onRetry={onRetry}
      />,
    );
    rerender(
      <DocumentCard
        document={document}
        onRemove={onRemove}
        onRetry={onRetry}
      />,
    );

    expect(
      screen.getByText("catan.pdf · 2.0 MB · 12 pages"),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Remove Catan" }));
    expect(onRemove).toHaveBeenCalledWith("catan/rules");
    expect(
      screen.getByTestId("library-catan-rules-remove-btn"),
    ).toBeInTheDocument();
  });

  it("renders rounded processing progress", () => {
    const { container } = render(
      <DocumentCard
        document={createDocument({
          status: "processing",
          pages: null,
          progress: 42.6,
        })}
        onRemove={vi.fn()}
        onRetry={vi.fn()}
      />,
    );

    expect(screen.getByText(/embedding — 43%/)).toBeInTheDocument();
    expect(
      container.querySelector('[data-slot="progress-indicator"]'),
    ).toHaveStyle({ transform: "translateX(-57%)" });
  });

  it("renders an error and retries the document", () => {
    const onRetry = vi.fn();
    render(
      <DocumentCard
        document={createDocument({ status: "error" })}
        onRemove={vi.fn()}
        onRetry={onRetry}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Could not extract");
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledWith("catan/rules");
  });

  it("handles dropzone browsing and drag events", () => {
    const onBrowse = vi.fn();
    const onDragStateChange = vi.fn();
    const onFile = vi.fn();
    const file = new File(["rules"], "rules.pdf", {
      type: "application/pdf",
    });
    const { rerender } = render(
      <Dropzone
        isDragging={false}
        onBrowse={onBrowse}
        onDragStateChange={onDragStateChange}
        onFile={onFile}
      />,
    );
    const dropzone = screen.getByRole("button");

    fireEvent.click(dropzone);
    fireEvent.dragOver(dropzone);
    fireEvent.dragLeave(dropzone);
    fireEvent.drop(dropzone, { dataTransfer: { files: [file] } });

    expect(onBrowse).toHaveBeenCalledOnce();
    expect(onDragStateChange).toHaveBeenNthCalledWith(1, true);
    expect(onDragStateChange).toHaveBeenNthCalledWith(2, false);
    expect(onFile).toHaveBeenCalledWith(file);

    rerender(
      <Dropzone
        isDragging
        onBrowse={onBrowse}
        onDragStateChange={onDragStateChange}
        onFile={onFile}
      />,
    );
    expect(screen.getByText("Drop to upload")).toBeInTheDocument();
  });

  it("clears the selected file", () => {
    const onClear = vi.fn();
    const file = new File([new Uint8Array(1024)], "pandemic.pdf", {
      type: "application/pdf",
    });
    render(<SelectedFileCard file={file} onClear={onClear} />);

    expect(screen.getByText("pandemic.pdf")).toBeInTheDocument();
    expect(screen.getByText("1 KB · ready to upload")).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Clear selected file" }),
    );
    expect(onClear).toHaveBeenCalledOnce();
  });
});
