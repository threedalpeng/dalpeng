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
      entry: {
        core: path.resolve(__dirname, "src/index.ts"),
        unsafe: path.resolve(__dirname, "src/runtime/unsafe.ts"),
      },
      formats: ["es"],
    },
    rollupOptions: {
      external: (id) => /^@dalpeng\/math(\/|$)/.test(id),
      output: {
        exports: "named",
        preserveModules: false,
        entryFileNames: "[name].js",
        chunkFileNames: "chunks/[name]-[hash].js",
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
