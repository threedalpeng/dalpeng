import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    server: {
      host: "0.0.0.0",
      port: 8081,
      /*
    hmr: {
      clientPort: 443,
    },
    */
    },
    build: {
      outDir: env.BUILD_DIR,
      emptyOutDir: true,
      target: "esnext",
      rollupOptions: {
        output: {
          generatedCode: "es2015",
        },
      },
    },
    base: "",
  };
});
