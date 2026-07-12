export type { Actor, AccountRole, PlanTier } from "@board-game-rules-assistant/database";

export class GuestSessionExpiredError extends Error {
  readonly code = "GUEST_SESSION_EXPIRED";

  constructor() {
    super("Guest session is unknown or expired");
    this.name = "GuestSessionExpiredError";
  }
}

export class ActorResolutionError extends Error {
  readonly code = "ACTOR_RESOLUTION_FAILED";

  constructor(message: string) {
    super(message);
    this.name = "ActorResolutionError";
  }
}

export class AuthenticationRequiredError extends Error {
  readonly code = "AUTHENTICATION_REQUIRED";
  constructor() { super("Verified authentication is required"); this.name = "AuthenticationRequiredError"; }
}

export class UnauthorizedResourceError extends Error {
  readonly code = "RESOURCE_NOT_FOUND";

  constructor() {
    super("Resource not found");
    this.name = "UnauthorizedResourceError";
  }
}
