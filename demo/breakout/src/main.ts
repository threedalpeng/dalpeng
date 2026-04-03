import { enableDebugPanel, BLOOM_GROUP, TONE_MAPPING_GROUP, runApp, mountOverlay, defineUI, defineText, useLayout } from "dalpeng";
import App from "./app/App";
import { score, lives, message } from "./app/composables/useGameState";

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

// Action map
app.input.defineAction("move-left", ["ArrowLeft", "KeyA"]);
app.input.defineAction("move-right", ["ArrowRight", "KeyD"]);
app.input.defineAction("launch", ["Space"]);
app.input.defineAction("restart", ["KeyR"]);

enableDebugPanel(app, {
  position: "top-right",
  controls: [BLOOM_GROUP, TONE_MAPPING_GROUP],
});

// HUD — reactive refs drive DOM updates automatically
mountOverlay(app, defineUI(() => [
  defineText(score, (v) => `Score: ${v}`, { size: 24 }),
]), { anchor: "top-left" });

mountOverlay(app, defineUI(() => [
  defineText(lives, (v) => "♥".repeat(Math.max(0, v)), { size: 24 }),
]), { anchor: "top-right" });

mountOverlay(app, defineUI(() => {
  useLayout("column", { gap: 4, align: "center" });
  return [
    defineText(message, (v) => v, { size: 48, bold: true }),
    defineText(message, (v) => v ? "Press R to restart" : "", { size: 18 }),
  ];
}), { anchor: "center" });
