import { defineConfig } from "vitest/config";

export default defineConfig({
  esbuild: {
    jsx: "automatic",
    jsxImportSource: "@dalpeng/ui",
  },
  resolve: {
    alias: {
      "@dalpeng/ui/jsx-runtime": new URL("src/core/jsx-runtime.ts", import.meta.url).pathname,
      "@dalpeng/ui/jsx-dev-runtime": new URL("src/core/jsx-runtime.ts", import.meta.url).pathname,
    },
  },
  test: {
    environment: "happy-dom",
  },
});
