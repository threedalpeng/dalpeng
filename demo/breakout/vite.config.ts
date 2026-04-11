import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import { devtools } from "@dalpeng/devtools-vite";

export default defineConfig({
  plugins: [devtools()],
  server: {
    host: "0.0.0.0",
    port: 8082,
  },
  resolve: {
    alias: {
      "@app": fileURLToPath(new URL("./src/app", import.meta.url)),
    },
  },
  build: {
    outDir: "./dist",
    target: "esnext",
  },
});
