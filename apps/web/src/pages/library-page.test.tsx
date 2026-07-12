import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { deleteRulebook, listRulebooks, uploadRulebookPdf } = vi.hoisted(() => ({
  deleteRulebook: vi.fn(),
  listRulebooks: vi.fn(),
  uploadRulebookPdf: vi.fn(),
}));

vi.mock("@/api/rulebook-api", () => ({
  deleteRulebook,
  listRulebooks,
  uploadRulebookPdf,
}));
vi.mock("uuid", () => ({ v4: () => "temporary-id" }));

import { LibraryPage } from "./library-page";

const selectFile = (file: File) => {
  fireEvent.change(screen.getByTestId("library-rulebook-file-input"), {
    target: { files: [file] },
  });
};

beforeEach(() => {
  vi.clearAllMocks();
  listRulebooks.mockResolvedValue({ rulebooks: [] });
  deleteRulebook.mockResolvedValue(undefined);
});

describe("LibraryPage", () => {
  it("loads persisted rulebooks and deletes one", async () => {
    listRulebooks.mockResolvedValue({
      rulebooks: [
        {
          id: "catan-id",
          gameName: "Catan",
          pdfName: "catan.pdf",
          fileSize: 2048,
        },
      ],
    });
    render(<LibraryPage />);

    expect(await screen.findByText("Catan")).toBeInTheDocument();
    expect(screen.getByText("1 document")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Remove Catan" }));

    await waitFor(() =>
      expect(deleteRulebook).toHaveBeenCalledWith("catan-id"),
    );
    expect(screen.getByText("No rulebooks yet")).toBeInTheDocument();
  });

  it("selects and uploads a PDF", async () => {
    uploadRulebookPdf.mockResolvedValue({
      id: "persisted-id",
      gameName: "Pandemic",
      pdfName: "pandemic.pdf",
      fileSize: 5,
      status: "completed",
      documentCount: 4,
      chunkCount: 10,
    });
    render(<LibraryPage />);
    await screen.findByText("No rulebooks yet");

    fireEvent.change(screen.getByTestId("library-game-name-input"), {
      target: { value: "  Pandemic  " },
    });
    selectFile(
      new File(["rules"], "pandemic.pdf", { type: "application/pdf" }),
    );

    expect(screen.getByText("pandemic.pdf")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("library-upload-submit-btn"));

    await waitFor(() =>
      expect(uploadRulebookPdf).toHaveBeenCalledWith({
        file: expect.any(File),
        gameName: "Pandemic",
      }),
    );
    expect(await screen.findByText("Ready")).toBeInTheDocument();
    expect(screen.getByText("1 document")).toBeInTheDocument();
    expect(screen.getByTestId("library-game-name-input")).toHaveValue("");
  });

  it("rejects non-PDF and oversized files", async () => {
    render(<LibraryPage />);
    await screen.findByText("No rulebooks yet");

    selectFile(new File(["notes"], "notes.txt", { type: "text/plain" }));
    expect(screen.getByRole("alert")).toHaveTextContent("isn't a PDF");

    const oversizedPdf = new File(["pdf"], "large.pdf", {
      type: "application/pdf",
    });
    Object.defineProperty(oversizedPdf, "size", { value: 41 * 1024 * 1024 });
    selectFile(oversizedPdf);
    expect(screen.getByRole("alert")).toHaveTextContent("over the 40 MB");
  });

  it("shows loading and upload failures", async () => {
    listRulebooks.mockRejectedValueOnce(new Error("load unavailable"));
    const { unmount } = render(<LibraryPage />);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "load unavailable",
    );
    unmount();

    listRulebooks.mockResolvedValue({ rulebooks: [] });
    uploadRulebookPdf.mockRejectedValue("upload unavailable");
    render(<LibraryPage />);
    await screen.findByText("No rulebooks yet");
    fireEvent.change(screen.getByTestId("library-game-name-input"), {
      target: { value: "Root" },
    });
    selectFile(new File(["rules"], "root.pdf", { type: "application/pdf" }));
    fireEvent.click(screen.getByTestId("library-upload-submit-btn"));

    expect(await screen.findByText("Failed")).toBeInTheDocument();
    expect(screen.getAllByRole("alert")[0]).toHaveTextContent(
      "Failed to upload rulebook PDF",
    );
  });

  it("restores a document when deletion fails", async () => {
    listRulebooks.mockResolvedValue({
      rulebooks: [
        {
          id: "root-id",
          gameName: "Root",
          pdfName: "root.pdf",
          fileSize: 100,
        },
      ],
    });
    deleteRulebook.mockRejectedValue("delete unavailable");
    render(<LibraryPage />);
    await screen.findByText("Root");

    fireEvent.click(screen.getByRole("button", { name: "Remove Root" }));

    expect(await screen.findByText("Root")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Failed to delete rulebook",
    );
  });

  it("retries a failed local upload and then clears the form", async () => {
    uploadRulebookPdf
      .mockRejectedValueOnce(new Error("first upload failed"))
      .mockResolvedValueOnce({
        id: "persisted-root",
        gameName: "Root",
        pdfName: "root.pdf",
        fileSize: 5,
        status: "completed",
        documentCount: 1,
        chunkCount: 2,
      });
    render(<LibraryPage />);
    await screen.findByText("No rulebooks yet");
    fireEvent.change(screen.getByTestId("library-game-name-input"), {
      target: { value: "Root" },
    });
    selectFile(new File(["rules"], "root.pdf", { type: "application/pdf" }));
    fireEvent.click(screen.getByTestId("library-upload-submit-btn"));
    expect(await screen.findByText("Failed")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("Ready")).toBeInTheDocument();
    expect(uploadRulebookPdf).toHaveBeenCalledTimes(2);
  });

  it("removes a failed local upload without calling delete", async () => {
    uploadRulebookPdf.mockRejectedValue(new Error("upload failed"));
    render(<LibraryPage />);
    await screen.findByText("No rulebooks yet");
    fireEvent.change(screen.getByTestId("library-game-name-input"), {
      target: { value: "Azul" },
    });
    selectFile(new File(["rules"], "azul.pdf", { type: "application/pdf" }));
    fireEvent.click(screen.getByTestId("library-upload-submit-btn"));
    expect(await screen.findByText("Failed")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Remove Azul" }));
    expect(screen.getByText("No rulebooks yet")).toBeInTheDocument();
    expect(deleteRulebook).not.toHaveBeenCalled();
  });
});
