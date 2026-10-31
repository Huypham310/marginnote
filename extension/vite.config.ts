import react from "@vitejs/plugin-react";
import { copyFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig, type Plugin } from "vite";

const root = import.meta.dirname;

// ONNX Runtime's JS glue for the wasm build that Transformers.js uses. By default it is fetched
// from jsDelivr, which MV3 forbids, so ship it with the extension. (The .wasm itself is already
// emitted by Vite into assets/ because the ORT bundle references it with new URL().)
function copyOrtWasm(): Plugin {
  const files = ["ort-wasm-simd-threaded.asyncify.mjs"];
  return {
    name: "copy-ort-wasm",
    writeBundle() {
      const from = resolve(root, "../node_modules/onnxruntime-web/dist");
      const to = resolve(root, "dist/ort");
      mkdirSync(to, { recursive: true });
      for (const f of files) copyFileSync(resolve(from, f), resolve(to, f));
    },
  };
}

// Two builds (see package.json "build"):
// - default: popup, options and the module service worker (can share chunks)
// - "content": the content script as ONE classic file, since content scripts can't use import
export default defineConfig(({ mode }) =>
  mode === "content"
    ? {
        publicDir: false,
        build: {
          outDir: "dist",
          emptyOutDir: false,
          lib: {
            entry: resolve(root, "src/content/index.ts"),
            formats: ["iife"],
            name: "MarginNoteContent",
            fileName: () => "content.js",
          },
        },
      }
    : {
        plugins: [react(), copyOrtWasm()],
        build: {
          outDir: "dist",
          emptyOutDir: true,
          rollupOptions: {
            input: {
              popup: resolve(root, "popup.html"),
              options: resolve(root, "options.html"),
              background: resolve(root, "src/background.ts"),
            },
            output: {
              // Chrome loads these by fixed names from manifest.json
              entryFileNames: "[name].js",
              chunkFileNames: "chunks/[name].js",
              assetFileNames: "assets/[name][extname]",
            },
          },
        },
      },
);
