import { defineConfig, loadEnv } from "vite";
import { devtools } from "@dalpeng/devtools-vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [devtools()],
    server: {
      host: "0.0.0.0",
      port: 8086,
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
