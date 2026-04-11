import { runApp } from "dalpeng";
import { setupDevTools } from "@dalpeng/devtools-vite/runtime";
import App from "./app/App";

const app = await runApp(App, "#app", {
  fit: "fill",
  features: {
    shadows: true,
    ssao: true,
    ibl: true,
    iblHdrUrl: "/hdri/meadow_1k.hdr",
    skybox: true,
    fxaa: true,
    bloom: true,
    bloomThreshold: 0.8,
    bloomIntensity: 0.3,
    postToneMapping: true,
    toneExposure: 1.2,
  },
});

app.input.defineAction("forward", ["KeyW", "ArrowUp"]);
app.input.defineAction("back", ["KeyS", "ArrowDown"]);
app.input.defineAction("left", ["KeyA", "ArrowLeft"]);
app.input.defineAction("right", ["KeyD", "ArrowRight"]);
app.input.defineAction("sprint", ["ShiftLeft", "ShiftRight"]);
app.input.defineAction("reset", ["KeyR"]);

await setupDevTools(app);
