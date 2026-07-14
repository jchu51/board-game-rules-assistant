export class AgentError extends Error {
  readonly agentName: string;
  override readonly cause?: unknown;

  constructor(agentName: string, message: string, cause?: unknown) {
    super(`${agentName}: ${message}`);
    this.name = "AgentError";
    this.agentName = agentName;
    this.cause = cause;
  }

  static runFailed(agentName: string, cause?: unknown): AgentError {
    return new AgentError(agentName, "failed to complete the request", cause);
  }
}
