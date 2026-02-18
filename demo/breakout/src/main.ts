import { createGameOverlay, enableDebugOverlay, runApp } from "dalpeng";
import App from "./app/App";
import { onGameEnd, onLivesChange, onScoreChange } from "./app/composables/useGameState";

const app = await runApp(App, "#app", {
  resolution: [1280, 720],
  fit: "contain",
});

app.features.shadows = true;
app.features.postToneMapping = true;
app.features.bloom = true;
app.features.bloomThreshold = 0.8;
app.features.bloomIntensity = 0.4;
app.features.bloomRadius = 4;
app.features.toneExposure = 1.2;
enableDebugOverlay(app, { position: "top-right", hotkeys: true });

// HUD overlay
const hud = createGameOverlay(app, (b) => {
  b.slot("score", "top-left", "<div style='font-size:24px'>Score: 0</div>")
   .slot("lives", "top-right", "<div style='font-size:24px'>♥♥♥</div>")
   .slot("message", "center");
});
hud.slot("message")?.hide();

onScoreChange((s) => hud.slot("score")?.update(`<div style="font-size:24px">Score: ${s}</div>`));
onLivesChange((l) => hud.slot("lives")?.update(`<div style="font-size:24px">${"♥".repeat(Math.max(0, l))}</div>`));
onGameEnd((type) => {
  const msg = type === "gameover" ? "GAME OVER" : "STAGE CLEAR!";
  hud.slot("message")?.update(
    `<div style="font-size:48px;text-align:center">${msg}<br><span style="font-size:18px">Press R to restart</span></div>`
  );
  hud.slot("message")?.show();
});
