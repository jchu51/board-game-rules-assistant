import type {
  Actor,
  LibraryRepository,
  PolicyRepository,
  TierPolicyRecord,
} from "@board-game-rules-assistant/database";

export class PlanLimitReachedError extends Error {
  readonly code = "PLAN_LIMIT_REACHED";

  constructor(readonly currentUsage: number, readonly limit: number) {
    super(`Private upload limit reached (${currentUsage}/${limit})`);
    this.name = "PlanLimitReachedError";
  }
}

export class AdminRequiredError extends Error {
  readonly code = "ADMIN_REQUIRED";

  constructor() {
    super("Administrator access is required");
    this.name = "AdminRequiredError";
  }
}

export class AccessPolicyService {
  constructor(
    private readonly policies: PolicyRepository,
    private readonly library: Pick<LibraryRepository, "countActivePrivateDocuments" | "createPrivateDocumentWithinLimit">,
  ) {}

  async getEffectivePolicy(actor: Actor): Promise<TierPolicyRecord> {
    const tier = actor.kind === "guest" ? "guest" : actor.planTier;
    const policy = await this.policies.getTierPolicy(tier);
    return actor.kind === "user" && actor.accountRole === "admin"
      ? { ...policy, retrievalTopK: 10 }
      : policy;
  }

  async createPrivateDocument(
    actor: Extract<Actor, { kind: "user" }>,
    input: Omit<Parameters<LibraryRepository["createPrivateDocumentWithinLimit"]>[0], "ownerId" | "limit">,
  ) {
    const policy = await this.getEffectivePolicy(actor);
    const result = await this.library.createPrivateDocumentWithinLimit({
      ...input, ownerId: actor.userId, limit: policy.privateUploadLimit,
    });
    if (!result.document) {
      throw new PlanLimitReachedError(result.currentUsage, policy.privateUploadLimit ?? result.currentUsage);
    }
    return result.document;
  }

  async assertCanCreatePrivateDocument(actor: Actor): Promise<void> {
    if (actor.kind !== "user") throw new PlanLimitReachedError(0, 0);
    const policy = await this.getEffectivePolicy(actor);
    if (policy.privateUploadLimit === null) return;
    const currentUsage = await this.library.countActivePrivateDocuments({ ownerId: actor.userId });
    if (currentUsage >= policy.privateUploadLimit) {
      throw new PlanLimitReachedError(currentUsage, policy.privateUploadLimit);
    }
  }

  assertAdmin(actor: Actor): void {
    if (actor.kind !== "user" || actor.accountRole !== "admin") throw new AdminRequiredError();
  }
}
