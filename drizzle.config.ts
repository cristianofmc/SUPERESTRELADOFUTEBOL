import { defineConfig } from "drizzle-kit";
import { loadEnvConfig } from "@next/env";

const projectRootDirectory = process.cwd();
const forceDevelopmentMode = true;

loadEnvConfig(projectRootDirectory, forceDevelopmentMode);

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is missing in environment variables.");
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./infra/migrations",
  dbCredentials: {
    url: databaseUrl,
  },
  verbose: true,
  strict: true,
});
