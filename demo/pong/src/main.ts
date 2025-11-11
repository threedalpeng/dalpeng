import { attachOverlay } from "@dalpeng/demo-devmode";
import { runApp } from "dalpeng";
import App from "./app/App";

// attachOverlay();

await runApp(App, "#app", { mode: "contain", fixedAspect: 16 / 9, pixelRatio: "device", autoResize: true });
