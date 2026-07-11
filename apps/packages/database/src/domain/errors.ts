export class PersistenceNotFoundError extends Error {
  readonly code = "PERSISTENCE_NOT_FOUND";

  constructor(resource: string) {
    super(`${resource} was not found`);
    this.name = "PersistenceNotFoundError";
  }
}

export class DatabaseUnavailableError extends Error {
  readonly code = "DATABASE_UNAVAILABLE";
  constructor(message = "database is unavailable", options?: ErrorOptions) {
    super(message, options);
    this.name = "DatabaseUnavailableError";
  }
}

export class MissingVectorExtensionError extends Error {
  readonly code = "MISSING_VECTOR_EXTENSION";
  constructor() {
    super("PostgreSQL vector extension is not installed");
    this.name = "MissingVectorExtensionError";
  }
}

export class EmbeddingDimensionMismatchError extends Error {
  readonly code = "EMBEDDING_DIMENSION_MISMATCH";
  constructor(expected: number, actual: number) {
    super(`expected ${expected} embedding dimensions, received ${actual}`);
    this.name = "EmbeddingDimensionMismatchError";
  }
}
