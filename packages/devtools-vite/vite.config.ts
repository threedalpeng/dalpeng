import path from "node:path";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig({
  build: {
    target: "esnext",
    lib: {
      entry: {
        index: path.resolve(__dirname, "src/index.ts"),
        runtime: path.resolve(__dirname, "src/runtime.ts"),
      },
      formats: ["es"],
      fileName: (_format, name) => `${name}.js`,
    },
    rollupOptions: {
      external: (id) => id === "vite" || /^@dalpeng\/devtools(\/|$)/.test(id),
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
      rollupTypes: false,
    }),
  ],
});
