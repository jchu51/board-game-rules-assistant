import type {
  Actor,
  IdentityRepository,
  UserRecord,
} from "@board-game-rules-assistant/database";
import type { NodeEnv } from "../../config/config-types";

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
    private readonly options: { nodeEnv: NodeEnv; localUserId: string },
  ) {}

  async resolve(headers: Headers): Promise<Actor> {
    const userId = singleHeader(headers["x-user-id"]);
    const guestSessionId = singleHeader(headers["x-guest-session-id"]);
    if (userId && guestSessionId) throw new Error("provide exactly one actor header");

    const resolvedUserId = userId ??
      (this.options.nodeEnv === "local" && !guestSessionId
        ? this.options.localUserId
        : undefined);
    if (resolvedUserId) {
      const user = await this.identity.getUserById({ id: resolvedUserId });
      if (!user) throw new Error("unknown user actor");
      return {
        kind: "user",
        userId: user.id,
        accountRole: user.accountRole,
        planTier: user.planTier,
      };
    }

    if (guestSessionId) {
      const guest = await this.identity.getGuestSession({ id: guestSessionId });
      if (!guest || guest.expiresAt <= new Date()) throw new Error("unknown or expired guest actor");
      return { kind: "guest", guestSessionId: guest.id };
    }
    throw new Error("x-user-id or x-guest-session-id actor header is required");
  }
}
