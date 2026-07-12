import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import type { EmbeddingsInterface } from "@langchain/core/embeddings";

const DEFAULT_TEST_DATABASE_URL =
  "postgresql://board_game_rules:board_game_rules@127.0.0.1:55432/board_game_rules";

export type TestDatabase = {
  pool: Pool;
  dispose(): Promise<void>;
};

export class KeywordEmbeddings implements EmbeddingsInterface {
  private readonly terms = ["resource", "road", "infection"];

  async embedDocuments(values: string[]): Promise<number[][]> {
    return values.map((value) => this.embed(value));
  }

  async embedQuery(value: string): Promise<number[]> {
    return this.embed(value);
  }

  private embed(value: string): number[] {
    const normalized = value.toLowerCase();
    const vector = this.terms.map((term) =>
      normalized.includes(term) ? 1 : 0,
    );

    return vector.some(Boolean) ? vector : [0.001, 0.001, 0.001];
  }
}

export const createTestDatabase = async (): Promise<TestDatabase> => {
  const databaseUrl =
    process.env.TEST_DATABASE_URL ?? DEFAULT_TEST_DATABASE_URL;
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
