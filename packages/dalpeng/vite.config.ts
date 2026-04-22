import path from "node:path";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig({
  build: {
    target: "esnext",
    lib: {
      entry: path.resolve(__dirname, "src/index.ts"),
      formats: ["es"],
      fileName: () => "dalpeng.js",
    },
    rollupOptions: {
      // Match subpaths too (`@dalpeng/ui/jsx-runtime` etc.).
      external: (id) => /^@dalpeng\/(core|math|ui)(\/|$)/.test(id),
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
