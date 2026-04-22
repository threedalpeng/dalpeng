import path from "node:path";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig({
  resolve: {
    alias: {
      "@dalpeng/ui/jsx-runtime": path.resolve(__dirname, "src/core/jsx-runtime.ts"),
    },
  },
  build: {
    target: "esnext",
    lib: {
      entry: {
        index: path.resolve(__dirname, "src/index.ts"),
        "core/index": path.resolve(__dirname, "src/core/index.ts"),
        "dom/index": path.resolve(__dirname, "src/dom/index.ts"),
        "core/jsx-runtime": path.resolve(__dirname, "src/core/jsx-runtime.ts"),
      },
      formats: ["es"],
    },
    rollupOptions: {
      // Match subpaths too (e.g. `@dalpeng/core/subpath`).
      external: (id) => /^@dalpeng\/(core|math)(\/|$)/.test(id),
      output: {
        exports: "named",
        preserveModules: false,
        entryFileNames: "[name].js",
        chunkFileNames: "chunks/[name]-[hash].js",
      },
    },
    minify: false,
  },
  plugins: [
    dts({
      tsconfigPath: path.resolve(__dirname, "tsconfig.json"),
      insertTypesEntry: true,
      rollupTypes: false,
    }),
  ],
});
