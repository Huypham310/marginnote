import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      // route shells only wrap a view in <Suspense>; the views themselves are tested
      exclude: ["src/**/*.test.{ts,tsx}", "src/app/**/{page,layout,not-found}.tsx"],
      reporter: ["text", "html", "json-summary"],
    },
  },
});
