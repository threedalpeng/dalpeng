import { enableDebugOverlay, runApp } from "dalpeng";
import App from "./app/App";

// attachOverlay();
const app = await runApp(App, "#app", { fit: "fill" });
app.features.shadows = true;
enableDebugOverlay(app, { position: "top-right", hotkeys: true });
