import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";
import dotenv from "dotenv";

dotenv.config({ path: [".env.development", ".env"] });

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "node",
    testTimeout: 60000,

    fileParallelism: false,

    threads: {
      singleThread: true,
    },
  },
  resolve: {
    alias: {
      "#": path.resolve(process.cwd(), "./"),
    },
  },
});
