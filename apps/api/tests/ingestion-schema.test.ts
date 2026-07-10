import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { UploadPdfsRequestSchema } from "../src/presentation/http/ingestion/ingestion-schema";

describe("UploadPdfsRequestSchema", () => {
  it("trims the game name and omits empty splitter params", () => {
    const body = UploadPdfsRequestSchema.parse({
      gameName: "  Catan  ",
    });

    assert.deepEqual(body, {
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

    assert.deepEqual(validBody, {
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

    assert.equal(invalidBody.success, false);
  });
});
