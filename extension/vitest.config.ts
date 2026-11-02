import { defineConfig } from "vitest/config";

// separate from vite.config.ts: tests don't need the two-build setup or the ORT copy step
export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    environment: "jsdom",
    coverage: {
      provider: "v8",
      // the DOM logic + pure helpers; popup/options UI and chrome wiring are checked by hand
      include: ["src/content/anchor.ts", "src/content/highlighter.ts", "src/popup/trim.ts", "src/shared/*.ts"],
      reporter: ["text", "html", "json-summary"],
    },
  },
});
