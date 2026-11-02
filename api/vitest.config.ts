import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    globalSetup: ["./test/global-setup.ts"],
    // every db test file truncates the same test database, so run files one at a time
    fileParallelism: false,
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      // index.ts only wires the real pool + listen, nothing to unit test there
      exclude: ["src/index.ts"],
      reporter: ["text", "html", "json-summary"],
    },
  },
});
