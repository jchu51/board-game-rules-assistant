import type { Persistence, UserRecord } from "@board-game-rules-assistant/database";
import type { NodeEnv } from "../../config/config-types";
import { bootstrapLocalUser } from "../auth/actor-service";

export const preparePersistence = async (
  persistence: Persistence,
  nodeEnv: NodeEnv,
  localUserId: string,
): Promise<UserRecord | undefined> => {
  await persistence.healthCheck();
  if (nodeEnv !== "local") return undefined;
  const user = await bootstrapLocalUser(persistence.identity, localUserId);
  const localGames = ["Azul", "Catan", "Gloomhaven", "Monopoly", "Pandemic", "Root", "Scythe", "Terraforming Mars", "Ticket to Ride", "Wingspan"];
  for (const [index, name] of localGames.entries()) {
    await persistence.library.resolveGame({
      id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
      name,
      slug: name.toLowerCase().replaceAll(" ", "-"),
    });
  }
  return user;
};

export const closePersistenceAfterServer = async (
  server: { close(callback: (error?: Error) => void): void },
  persistence: Pick<Persistence, "close">,
): Promise<void> => {
  const serverError = await new Promise<Error | undefined>((resolve) => {
    server.close((error) => resolve(error));
  });
  let persistenceError: unknown;
  try {
    await persistence.close();
  } catch (error) {
    persistenceError = error;
  }
  if (serverError && persistenceError) {
    throw new AggregateError([serverError, persistenceError], "server and persistence close failed");
  }
  if (serverError) throw serverError;
  if (persistenceError) throw persistenceError;
};
