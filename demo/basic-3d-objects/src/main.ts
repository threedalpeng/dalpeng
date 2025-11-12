import { enableDebugOverlay, runApp } from "dalpeng";
import App from "./app/App";

// attachOverlay();
const app = await runApp(App, "#app", { mode: "fill", pixelRatio: "device", autoResize: true });
enableDebugOverlay(app, { position: "top-right", hotkeys: true });
