import { enableDebugPanel, ALL_RENDER_GROUPS, runApp } from "dalpeng";
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
enableDebugPanel(app, {
  position: "top-right",
  controls: ALL_RENDER_GROUPS,
});
