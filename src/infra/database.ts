import { drizzle } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
import postgres from "postgres";
import { ServiceError } from "#infra/errors";

const queryClient = postgres({
  host: process.env.POSTGRES_HOST,
  port: Number(process.env.POSTGRES_PORT) || 5432,
  user: process.env.POSTGRES_USER,
  database: process.env.POSTGRES_DB,
  password: process.env.POSTGRES_PASSWORD,
  ssl: process.env.NODE_ENV === "production" ? "require" : false,
  max: 10,
});

export const db = drizzle(queryClient);

// ─── Status ───────────────────────────────────────────────────────────────────
// Fields come from a raw SQL query — Drizzle preserves the column names as-is
// from the database (snake_case). The interface reflects exactly what the query
// returns so callers have a typed contract without guessing.

export interface DatabaseStatus {
  environment: string;
  server_version: string;
  max_connections: number;
  current_connections: number;
}

async function status(): Promise<DatabaseStatus> {
  const databaseName = process.env.POSTGRES_DB;
  const appEnv = process.env.APP_ENV || process.env.NODE_ENV || "unknown";

  try {
    const result = await db.execute<Omit<DatabaseStatus, "environment">>(sql`
      select
        current_setting('server_version') as server_version,
        current_setting('max_connections')::int as max_connections,
        count(*)::int as current_connections
      from pg_stat_activity
      where datname = ${databaseName};
    `);

    return {
      environment: appEnv,
      ...result[0],
    };
  } catch (error) {
    throw new ServiceError({
      message: "Error connecting to the database or fetching status.",
      cause: error instanceof Error ? error : new Error(String(error)),
    });
  }
}

const database = {
  db,
  status,
};

export default database;
