import { setupDevTools } from "@dalpeng/devtools-vite/runtime";
import { runApp } from "dalpeng";
import App from "./app/App";

const app = await runApp(App, "#app", {
  resolution: [1280, 720],
  fit: "contain",
  features: {
    shadows: true,
    postToneMapping: true,
    bloom: true,
    bloomThreshold: 0.8,
    bloomIntensity: 0.4,
    bloomRadius: 4,
    toneExposure: 1.2,
  },
});

app.input.defineAction("move-left", ["ArrowLeft", "KeyA"]);
app.input.defineAction("move-right", ["ArrowRight", "KeyD"]);
app.input.defineAction("launch", ["Space"]);
app.input.defineAction("restart", ["KeyR"]);

await setupDevTools(app);
