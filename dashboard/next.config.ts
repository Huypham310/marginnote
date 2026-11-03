import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // standalone = small Docker image without the full node_modules
  output: "standalone",
  // workspaces hoist deps to the repo root, so file tracing has to start there
  outputFileTracingRoot: path.join(import.meta.dirname, ".."),
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
