import {
  Text,
  defineScene,
  defineUI,
  useLayout,
  usePlacement,
  withName,
} from "dalpeng";
import Ball from "./entities/Ball";
import BrickGrid from "./entities/BrickGrid";
import Camera from "./entities/Camera";
import GameManager from "./entities/GameManager";
import MainLight from "./entities/MainLight";
import Paddle from "./entities/Paddle";
import { score, lives, message } from "../composables/useGameState";

const ScoreHUD = defineUI(() => {
  usePlacement({
    anchor: { kind: "viewport", corner: "tl" },
    offset: { x: 12, y: 12 },
  });
  return [Text(score, (v) => `Score: ${v}`, { size: 24 })];
});

const LivesHUD = defineUI(() => {
  usePlacement({
    anchor: { kind: "viewport", corner: "tr" },
    offset: { x: 12, y: 12 },
  });
  return [
    Text(lives, (v) => "\u2665".repeat(Math.max(0, v)), { size: 24 }),
  ];
});

const MessageHUD = defineUI(() => {
  usePlacement({
    anchor: { kind: "viewport", corner: "c" },
    pivot: { x: 0.5, y: 0.5 },
  });
  useLayout("column", { gap: 4, align: "center" });
  return [
    Text(message, (v) => v, { size: 48, bold: true }),
    Text(message, (v) => (v ? "Press R to restart" : ""), { size: 18 }),
  ];
});

export default defineScene(() => {
  withName("Breakout Scene");
  return [
    Camera(),
    MainLight(),
    GameManager(),
    Paddle(),
    BrickGrid(),
    Ball(),
    ScoreHUD(),
    LivesHUD(),
    MessageHUD(),
  ];
});
