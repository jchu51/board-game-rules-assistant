import { describe, expect, it } from "vitest";

import { UploadPdfsRequestSchema } from "../src/presentation/http/ingestion/ingestion-schema";

describe("UploadPdfsRequestSchema", () => {
  it("trims the game name and omits empty splitter params", () => {
    const body = UploadPdfsRequestSchema.parse({
      gameName: "  Catan  ",
    });

    expect(body).toEqual({
      gameName: "Catan",
      splitterParams: undefined,
    });
  });

  it("coerces splitter params and rejects invalid overlap", () => {
    const validBody = UploadPdfsRequestSchema.parse({
      chunkOverlap: "25",
      chunkSize: "100",
      gameName: "Pandemic",
    });

    expect(validBody).toEqual({
      gameName: "Pandemic",
      splitterParams: {
        chunkOverlap: 25,
        chunkSize: 100,
      },
    });

    const invalidBody = UploadPdfsRequestSchema.safeParse({
      chunkOverlap: "100",
      chunkSize: "100",
      gameName: "Pandemic",
    });

    expect(invalidBody.success).toBe(false);
  });
});
