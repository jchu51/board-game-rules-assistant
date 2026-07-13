import { describe, expect, it } from "vitest";

import { InMemoryRulebookFileStore } from "../src/infrastructure/persistence/rulebook/in-memory-rulebook-file-store";

describe("InMemoryRulebookFileStore", () => {
  it("owns the stored PDF bytes", async () => {
    const store = new InMemoryRulebookFileStore();
    const pdfData = Uint8Array.from([1, 2, 3]);

    await store.save({
      id: "rulebook-1",
      gameName: "Catan",
      pdfName: "catan.pdf",
      mimeType: "application/pdf",
      fileSize: pdfData.byteLength,
      pdfData,
    });
    pdfData[0] = 9;

    const firstRead = store.get("rulebook-1");
    expect(firstRead?.pdfData).toEqual(Uint8Array.from([1, 2, 3]));

    if (firstRead) firstRead.pdfData[1] = 8;

    expect(store.get("rulebook-1")?.pdfData).toEqual(
      Uint8Array.from([1, 2, 3]),
    );
  });
});
