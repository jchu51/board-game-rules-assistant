import { DatabaseUnavailableError } from "../domain/errors.js";

const availabilityCodes = new Set([
  "CONNECTION_CLOSED", "CONNECTION_DESTROYED", "CONNECTION_ENDED", "CONNECT_TIMEOUT",
  "EAI_AGAIN", "ECONNREFUSED", "ECONNRESET", "EHOSTUNREACH", "ENETUNREACH",
  "ENOTFOUND", "ETIMEDOUT", "57P01", "57P02", "57P03",
  "08000", "08001", "08003", "08004", "08006", "08007", "08P01",
]);

type ErrorLike = { code?: unknown; cause?: unknown };

const isAvailabilityFailure = (error: unknown): boolean => {
  let current = error;
  const seen = new Set<unknown>();
  while (current && typeof current === "object" && !seen.has(current)) {
    seen.add(current);
    const candidate = current as ErrorLike;
    if (
      typeof candidate.code === "string" &&
      (availabilityCodes.has(candidate.code) || candidate.code.startsWith("08"))
    ) return true;
    current = candidate.cause;
  }
  return false;
};

const translatePostgresError = (error: unknown): never => {
  if (error instanceof DatabaseUnavailableError || !isAvailabilityFailure(error)) throw error;
  throw new DatabaseUnavailableError("database is unavailable", { cause: error });
};

export const withPostgresErrorBoundary = <T extends object>(adapter: T): T =>
  new Proxy(adapter, {
    get(target, property, receiver) {
      const value = Reflect.get(target, property, receiver) as unknown;
      if (typeof value !== "function") return value;
      return (...args: unknown[]) => {
        try {
          return Promise.resolve(Reflect.apply(value, target, args)).catch(translatePostgresError);
        } catch (error) {
          return translatePostgresError(error);
        }
      };
    },
  });
