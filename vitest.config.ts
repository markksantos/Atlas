import { defineConfig } from "vitest/config";

// Standalone Vitest config. The Vite config sets `root: "client"` for the
// frontend build; tests live under `server/`, so we override the root here
// and run in a Node environment.
export default defineConfig({
  test: {
    root: ".",
    environment: "node",
    include: ["server/**/*.{test,spec}.ts"]
  }
});
