import { defineConfig } from "vite";
import typescript from "@rollup/plugin-typescript";

export default defineConfig({
  build: {
    lib: {
      name: "core",
      entry: "src/index.ts",
    },
    rollupOptions: {
      plugins: [
        typescript({
          target: "es6",
          module: "ESNext",
          lib: ["ESNext", "DOM"],
          moduleResolution: "Node",
          declaration: true,
          emitDeclarationOnly: true,
          esModuleInterop: true,
          outDir: "./dist",
        }),
      ],
    },
  },
});
