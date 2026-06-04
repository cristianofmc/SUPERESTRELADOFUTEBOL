import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig(({ mode }) => {
  const env = {
    ...loadEnv("development", process.cwd(), ""),
    ...loadEnv(mode, process.cwd(), ""),
  };

  return {
    plugins: [react()],
    test: {
      globals: true,
      environment: "node",
      testTimeout: 60000,
      hookTimeout: 60000,
      fileParallelism: false,
      maxWorkers: 1,
      isolate: false,
      include: ["tests/**/*.test.ts"],
      env,
    },
    resolve: {
      alias: {
        "#tests": path.resolve(process.cwd(), "./tests"),
        "#": path.resolve(process.cwd(), "./src"),
      },
    },
  };
});
