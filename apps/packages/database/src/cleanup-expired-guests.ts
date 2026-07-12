import type { Persistence } from "./domain/repositories.js";
import { fileURLToPath } from "node:url";
import { createPostgresClient } from "./postgres/client.js";
import { createPostgresRepositories } from "./postgres/repositories.js";

export const cleanupExpiredGuestSessions = async (
  persistence: Persistence,
  now: Date,
): Promise<{ deletedSessions: number }> => ({
  deletedSessions: await persistence.identity.deleteExpiredGuestSessions({ now }),
});

const runCommand = async () => {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required");
  const { db, sql } = createPostgresClient(databaseUrl);
  try {
    const deletedSessions = await createPostgresRepositories(db).identity.deleteExpiredGuestSessions({ now: new Date() });
    console.log(JSON.stringify({ deletedSessions }));
  } finally { await sql.end(); }
};

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  runCommand().catch((error) => { console.error(error); process.exitCode = 1; });
}
