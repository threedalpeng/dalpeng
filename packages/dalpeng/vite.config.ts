import path from "node:path";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig({
  build: {
    target: "esnext",
    lib: {
      entry: path.resolve(__dirname, "src/index.ts"),
      name: "Dalpeng",
      formats: ["es", "umd"],
      fileName: (format) => (format === "es" ? "dalpeng.js" : "dalpeng.umd.cjs"),
    },
    rollupOptions: {
      external: ["@dalpeng/core", "@dalpeng/math"],
      output: {
        exports: "named",
        globals: {
          "@dalpeng/core": "DalpengCore",
          "@dalpeng/math": "DalpengMath",
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
