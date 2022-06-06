import { defineConfig } from "vite";
import typescript from "@rollup/plugin-typescript";

export default defineConfig({
  build: {
    lib: {
      name: "math",
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
          declarationDir: "./dist",
          outDir: "./dist",
        }),
      ],
    },
  },
});
