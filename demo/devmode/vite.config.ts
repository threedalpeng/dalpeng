import path from "node:path";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig({
  build: {
    target: "esnext",
    lib: {
      entry: path.resolve(__dirname, "src/main.ts"),
      name: "DalpengDemoDevmode",
      formats: ["es", "umd"],
      fileName: (format) =>
        format === "es" ? "demo-devmode.js" : "demo-devmode.umd.cjs",
    },
    rollupOptions: {
      output: { inlineDynamicImports: true },
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
