import { defineConfig } from "vite";

export default defineConfig({
  server: {
    hmr: {
      clientPort: 443,
    },
  },
  build: {
    outDir: "../../../../webgl-guide/webgl-guide-backend/dist/client/pong",
    target: "esnext",
    rollupOptions: {
      output: {
        generatedCode: "es2015",
      },
    },
  },
  base: "",
});
