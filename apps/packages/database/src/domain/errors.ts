export class PersistenceNotFoundError extends Error {
  readonly code = "PERSISTENCE_NOT_FOUND";

  constructor(resource: string) {
    super(`${resource} was not found`);
    this.name = "PersistenceNotFoundError";
  }
}
