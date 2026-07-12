import postgres from "postgres";
import { runPostgresMigrations } from "@board-game-rules-assistant/database";

export type SqlClient = {
  unsafe(query: string): Promise<unknown>;
  end(): Promise<void>;
};

const retainedCleanupErrors = new WeakMap<object, unknown[]>();

export const getRetainedCleanupErrors = (error: object): readonly unknown[] =>
  retainedCleanupErrors.get(error) ?? [];

export const retainCleanupError = (primary: unknown, cleanup: unknown): void => {
  if ((typeof primary === "object" && primary !== null) || typeof primary === "function") {
    const key = primary as object;
    retainedCleanupErrors.set(key, [...(retainedCleanupErrors.get(key) ?? []), cleanup]);
  }
};

const throwCleanupErrors = (errors: unknown[]): never | void => {
  if (errors.length === 1) throw errors[0];
  if (errors.length > 1) throw new AggregateError(errors, "PostgreSQL test database cleanup failed");
};

export async function createCleanPostgresTestDatabase(input: {
  baseUrl?: string;
  databaseName?: string;
  connect?: (url: string) => SqlClient;
  migrate?: (client: SqlClient) => Promise<void>;
} = {}) {
  const base = new URL(input.baseUrl ?? process.env.DATABASE_URL ?? "postgres://board_game_rules:board_game_rules@localhost:5432/board_game_rules");
  const name = input.databaseName ?? `persistence_smoke_${crypto.randomUUID().replaceAll("-", "")}`;
  const connect = input.connect ?? ((url: string) => postgres(url, { max: 1, onnotice: () => {} }));
  const migrate = input.migrate ?? ((client: SqlClient) => runPostgresMigrations(client as Parameters<typeof runPostgresMigrations>[0]));
  const admin = connect(base.toString());

  try {
    await admin.unsafe(`CREATE DATABASE ${name}`);
  } catch (primary) {
    try { await admin.end(); } catch (cleanup) { retainCleanupError(primary, cleanup); }
    throw primary;
  }

  const databaseUrl = new URL(base);
  databaseUrl.pathname = `/${name}`;
  let migrationClient: SqlClient | undefined;
  try {
    migrationClient = connect(databaseUrl.toString());
    await migrate(migrationClient);
    await migrationClient.end();
  } catch (primary) {
    try { await migrationClient?.end(); } catch (cleanup) { retainCleanupError(primary, cleanup); }
    try { await admin.unsafe(`DROP DATABASE ${name} WITH (FORCE)`); } catch (cleanup) { retainCleanupError(primary, cleanup); }
    try { await admin.end(); } catch (cleanup) { retainCleanupError(primary, cleanup); }
    throw primary;
  }

  return {
    databaseUrl: databaseUrl.toString(),
    async dispose() {
      const errors: unknown[] = [];
      try { await admin.unsafe(`DROP DATABASE ${name} WITH (FORCE)`); } catch (error) { errors.push(error); }
      try { await admin.end(); } catch (error) { errors.push(error); }
      throwCleanupErrors(errors);
    },
  };
}
