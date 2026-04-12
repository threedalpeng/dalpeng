import path from "node:path";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig({
  build: {
    target: "esnext",
    lib: {
      entry: path.resolve(__dirname, "src/index.ts"),
      name: "DalpengUI",
      formats: ["es", "umd"],
      fileName: (format) => (format === "es" ? "dalpeng-ui.js" : "dalpeng-ui.umd.cjs"),
    },
    rollupOptions: {
      external: ["@dalpeng/core"],
      output: {
        exports: "named",
        globals: {
          "@dalpeng/core": "DalpengCore",
        },
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
