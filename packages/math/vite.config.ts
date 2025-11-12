import path from "node:path";
import dts from "vite-plugin-dts";
import { defineConfig } from "vitest/config";

export default defineConfig({
  build: {
    target: "esnext",
    lib: {
      entry: path.resolve(__dirname, "src/index.ts"),
      name: "DalpengMath",
      formats: ["es", "umd"],
      fileName: (format) => (format === "es" ? "math.js" : "math.umd.cjs"),
    },
    rollupOptions: {
      output: {
        exports: "named",
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
  test: {
    environment: "node",
    include: ["test/**/*.{test,spec}.ts"],
  },
});
