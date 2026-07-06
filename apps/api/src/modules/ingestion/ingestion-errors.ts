export class InvalidIngestionFilePathError extends Error {
  constructor() {
    super("Invalid ingestion file path.");
    this.name = "InvalidIngestionFilePathError";
  }
}

export class IngestionFileTooLargeError extends Error {
  constructor(
    readonly fileSizeBytes: number,
    readonly maxSizeBytes: number,
  ) {
    super(
      `Ingestion file is ${fileSizeBytes} bytes, exceeding the ${maxSizeBytes}-byte limit.`,
    );
    this.name = "IngestionFileTooLargeError";
  }
}
