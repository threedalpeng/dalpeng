import { defineConfig } from "vite";

export default defineConfig({
  server: {
    host: "0.0.0.0",
    /*
    hmr: {
      clientPort: 443,
    },
    */
  },
  build: {
    outDir: "../../../../webgl-guide/webgl-guide-backend/dist/demo/pong",
    target: "esnext",
    rollupOptions: {
      output: {
        generatedCode: "es2015",
      },
    },
  },
  base: "",
});
