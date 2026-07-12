import type {
  Actor,
  IdentityRepository,
  UserRecord,
} from "@board-game-rules-assistant/database";
import type { NodeEnv } from "../../config/config-types";
import { ActorResolutionError, AuthenticationRequiredError, GuestSessionExpiredError } from "../../domain/identity/actor";

type Headers = Record<string, string | string[] | undefined>;

const singleHeader = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;

export const bootstrapLocalUser = async (
  identity: IdentityRepository,
  id: string,
): Promise<UserRecord> => {
  const existing = await identity.getUserById({ id });
  if (existing) return existing;
  return identity.createUser({
    id,
    email: "local@board-game-rules.invalid",
    displayName: "Local Standard User",
    accountRole: "user",
    planTier: "standard",
  });
};

export class ActorService {
  constructor(
    private readonly identity: IdentityRepository,
    private readonly options: { nodeEnv: NodeEnv; localUserId: string; allowDevelopmentHeaders: boolean },
  ) {}

  async resolve(headers: Headers): Promise<Actor> {
    if (!["local", "test"].includes(this.options.nodeEnv) || !this.options.allowDevelopmentHeaders) {
      throw new AuthenticationRequiredError();
    }
    const userId = singleHeader(headers["x-user-id"]);
    const guestSessionId = singleHeader(headers["x-guest-session-id"]);
    if (userId && guestSessionId) throw new ActorResolutionError("provide exactly one actor header");

    const resolvedUserId = userId ??
      (this.options.nodeEnv === "local" && !guestSessionId
        ? this.options.localUserId
        : undefined);
    if (resolvedUserId) {
      const user = await this.identity.getUserById({ id: resolvedUserId });
      if (!user) throw new ActorResolutionError("unknown user actor");
      return {
        kind: "user",
        userId: user.id,
        accountRole: user.accountRole,
        planTier: user.planTier,
      };
    }

    if (guestSessionId) {
      const guest = await this.identity.getGuestSession({ id: guestSessionId });
      if (!guest || guest.expiresAt <= new Date()) throw new GuestSessionExpiredError();
      return { kind: "guest", guestSessionId: guest.id };
    }
    throw new ActorResolutionError("x-user-id or x-guest-session-id actor header is required");
  }
}
