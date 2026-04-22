import path from "node:path";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";
import { glslInclude } from "./vite-plugin-glsl-include";

export default defineConfig({
  resolve: {
    alias: [{ find: "@", replacement: path.resolve(__dirname, "src") }],
  },
  build: {
    target: "esnext",
    lib: {
      entry: path.resolve(__dirname, "src/index.ts"),
      formats: ["es"],
      fileName: () => "core.js",
    },
    rollupOptions: {
      external: (id) => /^@dalpeng\/math(\/|$)/.test(id),
      output: {
        exports: "named",
      },
    },
    minify: false,
  },
  plugins: [
    glslInclude(),
    dts({
      tsconfigPath: path.resolve(__dirname, "tsconfig.json"),
      insertTypesEntry: true,
      rollupTypes: true,
    }),
  ],
});
