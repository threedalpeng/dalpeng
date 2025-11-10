import path from "node:path";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig({
  resolve: {
    alias: [{ find: "@", replacement: path.resolve(__dirname, "src") }],
  },
  build: {
    target: "esnext",
    lib: {
      entry: path.resolve(__dirname, "src/index.ts"),
      name: "DalpengCore",
      formats: ["es", "umd"],
      fileName: (format) => (format === "es" ? "core.js" : "core.umd.cjs"),
    },
    rollupOptions: {
      external: ["@dalpeng/math"],
      output: {
        exports: "named",
        globals: {
          "@dalpeng/math": "DalpengMath",
        },
      },
    },
  },
  plugins: [
    dts({
      tsconfigPath: path.resolve(__dirname, "tsconfig.json"),
      insertTypesEntry: true,
      rollupTypes: true,
    }),
  ],
});
