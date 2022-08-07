import { defineConfig } from "vite";

export default defineConfig({
  server: {
    host: "0.0.0.0",
    port: 5050,
    /*
    hmr: {
      clientPort: 443,
    },
    */
  },
  build: {
    outDir:
      "../../../../webgl-guide/webgl-guide-backend/dist/demo/basic-3d-objects",
    target: "esnext",
    rollupOptions: {
      output: {
        generatedCode: "es2015",
      },
    },
  },
  base: "",
});
