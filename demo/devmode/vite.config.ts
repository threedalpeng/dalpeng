import { defineConfig } from "vite";
import typescript from "@rollup/plugin-typescript";

export default defineConfig({
  build: {
    lib: {
      name: "demo-devmode",
      entry: "src/main.ts",
    },
    rollupOptions: {
      output: { inlineDynamicImports: true },
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
