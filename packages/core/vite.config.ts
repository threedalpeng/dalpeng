import { defineConfig } from "vite";
import typescript from "@rollup/plugin-typescript";
import ttypescript from "ttypescript";
import path from "path";

export default defineConfig({
  resolve: {
    alias: [{ find: "@", replacement: path.resolve(__dirname, "./src") }],
  },
  build: {
    lib: {
      name: "core",
      entry: "src/index.ts",
    },
    rollupOptions: {
      plugins: [
        typescript({
          target: "es2020",
          module: "ESNext",
          lib: ["ESNext", "DOM"],
          moduleResolution: "Node",
          declaration: true,
          emitDeclarationOnly: true,
          esModuleInterop: true,
          outDir: "./dist",
          typescript: ttypescript,
        }),
      ],
    },
  },
});
