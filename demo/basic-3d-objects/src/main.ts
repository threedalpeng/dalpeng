import { runApp } from "dalpeng";
import App from "./app/App";

// attachOverlay();

await runApp(App, "#app", { mode: "fill", pixelRatio: "device", autoResize: true });
