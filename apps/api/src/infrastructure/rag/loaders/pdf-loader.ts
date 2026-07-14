import { readFile } from "node:fs/promises";
import { Document } from "@langchain/core/documents";
import { getDocument, version } from "pdfjs-dist/legacy/build/pdf.mjs";
import type { RulebookDocument } from "../documents/rulebook-document.js";

export interface LoadPdfDocumentsOptions {
  parsedItemSeparator?: string;
  source?: string;
  splitPages?: boolean;
}

interface PdfDocument {
  numPages: number;
  getMetadata(): Promise<{
    info?: unknown;
    metadata?: unknown;
  }>;
  getPage(pageNumber: number): Promise<PdfPage>;
}

interface PdfPage {
  getTextContent(): Promise<{
    items: PdfTextItem[];
  }>;
}

interface PdfTextItem {
  str?: string;
  transform?: number[];
}

export async function loadPdfDocuments(
  filePath: string,
  options: LoadPdfDocumentsOptions = {},
): Promise<RulebookDocument[]> {
  const buffer = await readFile(filePath);

  return parsePdfDocuments(buffer, {
    ...options,
    source: options.source ?? filePath,
  });
}

export async function parsePdfDocuments(
  buffer: Buffer,
  {
    parsedItemSeparator = "",
    source,
    splitPages = true,
  }: LoadPdfDocumentsOptions = {},
): Promise<RulebookDocument[]> {
  const pdf = (await getDocument({
    data: new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength),
    useSystemFonts: true,
    useWorkerFetch: false,
  }).promise) as PdfDocument;

  const metadata = await pdf.getMetadata().catch(() => undefined);
  const pageDocuments: RulebookDocument[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const pageContent = textItemsToPageContent(
      content.items,
      parsedItemSeparator,
    );

    if (pageContent.length === 0) {
      continue;
    }

    pageDocuments.push(
      new Document({
        pageContent,
        metadata: {
          loc: { pageNumber },
          pdf: {
            info: metadata?.info,
            metadata: metadata?.metadata,
            totalPages: pdf.numPages,
            version,
          },
          source,
        },
      }),
    );
  }

  if (splitPages) {
    return pageDocuments;
  }

  if (pageDocuments.length === 0) {
    return [];
  }

  return [
    new Document({
      pageContent: pageDocuments
        .map((document) => document.pageContent)
        .join("\n\n"),
      metadata: {
        pdf: {
          info: metadata?.info,
          metadata: metadata?.metadata,
          totalPages: pdf.numPages,
          version,
        },
        source,
      },
    }),
  ];
}

function textItemsToPageContent(
  items: PdfTextItem[],
  parsedItemSeparator: string,
): string {
  const textItems: string[] = [];
  let previousY: number | undefined;

  for (const item of items) {
    if (!item.str) {
      continue;
    }

    const currentY = item.transform?.[5];
    const isNewLine = previousY !== undefined && currentY !== previousY;

    textItems.push(`${isNewLine ? "\n" : ""}${item.str}`);
    previousY = currentY;
  }

  return textItems.join(parsedItemSeparator).trim();
}
