import { randomUUID } from "node:crypto";
import { Pool } from "pg";

const DEFAULT_TEST_DATABASE_URL =
  "postgresql://board_game_rules:board_game_rules@127.0.0.1:55432/board_game_rules";

export type TestDatabase = {
  pool: Pool;
  dispose(): Promise<void>;
};

export const createTestDatabase = async (): Promise<TestDatabase> => {
  const databaseUrl = process.env.TEST_DATABASE_URL ?? DEFAULT_TEST_DATABASE_URL;
  const schema = `test_${randomUUID().replaceAll("-", "")}`;
  const adminPool = new Pool({ connectionString: databaseUrl });
  await adminPool.query(`CREATE SCHEMA "${schema}"`);

  const pool = new Pool({
    connectionString: databaseUrl,
    options: `-c search_path=${schema},public`,
  });

  return {
    pool,
    async dispose() {
      await pool.end();
      await adminPool.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      await adminPool.end();
    },
  };
};
