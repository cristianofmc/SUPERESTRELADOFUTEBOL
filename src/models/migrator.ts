import path from "node:path";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { sql } from "drizzle-orm";
import { db } from "#infra/database";

const migrationsFolder = path.join(process.cwd(), "src", "infra", "migrations");

export async function listPendingMigrations() {
  const allMigrations = readMigrationFiles({ migrationsFolder });

  const appliedResult = await db.execute(
    sql`SELECT hash FROM __drizzle_migrations ORDER BY created_at`,
  );

  const appliedHashes = new Set(appliedResult.map((row) => row.hash as string));

  return allMigrations.filter((m) => !appliedHashes.has(m.hash));
}

export async function runPendingMigrations() {
  await migrate(db, { migrationsFolder });
  return { success: true };
}

const migrator = {
  listPendingMigrations,
  runPendingMigrations,
};

export default migrator;
