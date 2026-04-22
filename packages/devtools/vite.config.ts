import path from "node:path";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig({
  build: {
    target: "esnext",
    lib: {
      entry: path.resolve(__dirname, "src/index.ts"),
      formats: ["es"],
      fileName: () => "dalpeng-devtools.js",
    },
    rollupOptions: {
      // Match subpaths too (e.g. `@dalpeng/ui/jsx-runtime`, `@dalpeng/ui/dom`).
      external: (id) => /^@dalpeng\/(core|ui|math)(\/|$)/.test(id),
      output: {
        exports: "named",
      },
    },
    minify: false,
  },
  plugins: [
    dts({
      tsconfigPath: path.resolve(__dirname, "tsconfig.json"),
      insertTypesEntry: true,
      rollupTypes: true,
    }),
  ],
});
