import path from "node:path";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig({
  build: {
    target: "esnext",
    lib: {
      entry: path.resolve(__dirname, "src/index.ts"),
      name: "DalpengDevTools",
      formats: ["es", "umd"],
      fileName: (format) =>
        format === "es" ? "dalpeng-devtools.js" : "dalpeng-devtools.umd.cjs",
    },
    rollupOptions: {
      external: ["@dalpeng/core", "@dalpeng/ui"],
      output: {
        exports: "named",
        globals: {
          "@dalpeng/core": "DalpengCore",
          "@dalpeng/ui": "DalpengUI",
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
