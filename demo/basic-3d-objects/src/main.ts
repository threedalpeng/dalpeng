import { enableDebugPanel, SHADOWS_GROUP, TONE_MAPPING_GROUP, runApp } from "dalpeng";
import App from "./app/App";

const app = await runApp(App, "#app", {
  fit: "fill",
  features: { shadows: true },
});
enableDebugPanel(app, {
  position: "top-right",
  controls: [SHADOWS_GROUP, TONE_MAPPING_GROUP],
});
