import { defineConfig } from "vite";
import dts from "vite-plugin-dts";
import path from "path";

export default defineConfig({
  resolve: {
    alias: [{ find: "@", replacement: path.resolve(__dirname, "./src") }],
  },
  build: {
    lib: {
      name: "core",
      entry: "src/index.ts",
    },
  },
  plugins: [
    dts({
      insertTypesEntry: true,
    }),
  ],
});
