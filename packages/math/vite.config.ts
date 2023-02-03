import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig({
  build: {
    lib: {
      name: "math",
      entry: "src/index.ts",
    },
  },
  plugins: [
    dts({
      insertTypesEntry: true,
    }),
  ],
});
