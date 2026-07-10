export class InvalidSplitterParamsError extends Error {
  constructor(chunkSize: number, chunkOverlap: number) {
    super(
      `chunkOverlap (${chunkOverlap}) must be less than chunkSize (${chunkSize}).`,
    );
    this.name = "InvalidSplitterParamsError";
  }
}
