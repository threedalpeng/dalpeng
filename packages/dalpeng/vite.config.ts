import { defineConfig } from "vite";
import dts from "vite-plugin-dts";
export default defineConfig({
  build: {
    lib: {
      name: "core",
      entry: "src/index.ts",
    },
    minify: false,
  },
  plugins: [
    dts({
      insertTypesEntry: true,
    }),
  ],
});
