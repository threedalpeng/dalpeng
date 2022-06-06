import { defineConfig } from "vite";

export default defineConfig({
  server: {
    hmr: {
      clientPort: 443,
    },
  },
  build: {
    target: "esnext",
    rollupOptions: {
      output: {
        generatedCode: "es2015",
      },
    },
  },
  base: "",
});
