import { beforeEach, describe, expect, it, vi } from "vitest";

const { getDocument, readFile } = vi.hoisted(() => ({
  getDocument: vi.fn(),
  readFile: vi.fn(),
}));

vi.mock("node:fs/promises", () => ({ readFile }));
vi.mock("pdfjs-dist/legacy/build/pdf.mjs", () => ({
  getDocument,
  version: "test-pdfjs-version",
}));

import {
  loadPdfDocuments,
  parsePdfDocuments,
} from "../../src/infrastructure/rag/loaders/pdf-loader";

const createPdf = ({ metadataFails = false } = {}) => ({
  numPages: 3,
  getMetadata: metadataFails
    ? vi.fn().mockRejectedValue(new Error("metadata unavailable"))
    : vi.fn().mockResolvedValue({
        info: { title: "Catan" },
        metadata: { language: "en" },
      }),
  getPage: vi.fn(async (pageNumber: number) => ({
    getTextContent: vi.fn().mockResolvedValue({
      items:
        pageNumber === 1
          ? [
              {},
              { str: "Build", transform: [1, 0, 0, 1, 0, 10] },
              { str: "a", transform: [1, 0, 0, 1, 0, 10] },
              { str: "city", transform: [1, 0, 0, 1, 0, 5] },
            ]
          : pageNumber === 2
            ? [{ str: "" }]
            : [{ str: "Score points" }],
    }),
  })),
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("PDF loader", () => {
  it("loads a file and creates one document per non-empty page", async () => {
    const buffer = Buffer.from("pdf data");
    const pdf = createPdf();
    readFile.mockResolvedValue(buffer);
    getDocument.mockReturnValue({ promise: Promise.resolve(pdf) });

    const documents = await loadPdfDocuments("rulebooks/catan.pdf");

    expect(readFile).toHaveBeenCalledWith("rulebooks/catan.pdf");
    expect(documents).toHaveLength(2);
    expect(documents[0]).toMatchObject({
      pageContent: "Builda\ncity",
      metadata: {
        loc: { pageNumber: 1 },
        pdf: {
          info: { title: "Catan" },
          metadata: { language: "en" },
          totalPages: 3,
          version: "test-pdfjs-version",
        },
        source: "rulebooks/catan.pdf",
      },
    });
  });

  it("combines non-empty pages and tolerates unavailable metadata", async () => {
    getDocument.mockReturnValue({
      promise: Promise.resolve(createPdf({ metadataFails: true })),
    });

    const documents = await parsePdfDocuments(Buffer.from("pdf data"), {
      parsedItemSeparator: " ",
      source: "uploaded.pdf",
      splitPages: false,
    });

    expect(documents).toEqual([
      expect.objectContaining({
        pageContent: "Build a \ncity\n\nScore points",
        metadata: {
          pdf: {
            info: undefined,
            metadata: undefined,
            totalPages: 3,
            version: "test-pdfjs-version",
          },
          source: "uploaded.pdf",
        },
      }),
    ]);
  });

  it("returns no combined document when every page is empty", async () => {
    getDocument.mockReturnValue({
      promise: Promise.resolve({
        numPages: 1,
        getMetadata: vi.fn().mockResolvedValue({}),
        getPage: vi.fn().mockResolvedValue({
          getTextContent: vi.fn().mockResolvedValue({ items: [] }),
        }),
      }),
    });

    const documents = await parsePdfDocuments(Buffer.from("pdf data"), {
      splitPages: false,
    });

    expect(documents).toEqual([]);
  });
});
