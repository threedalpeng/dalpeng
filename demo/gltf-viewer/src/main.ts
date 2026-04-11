import { runApp } from "dalpeng";
import { setupDevTools } from "@dalpeng/devtools-vite/runtime";
import App from "./app/App";

const app = await runApp(App, "#app", {
  fit: "fill",
  features: {
    shadows: true,
    ssao: true,
    ibl: true,
    iblHdrUrl: "/hdri/env.hdr",
    skybox: true,
    fxaa: true,
  },
});

await setupDevTools(app);
