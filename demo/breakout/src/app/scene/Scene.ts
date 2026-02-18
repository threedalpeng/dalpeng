import { defineScene, withName } from "dalpeng";
import Ball from "./entities/Ball";
import BrickGrid from "./entities/BrickGrid";
import Camera from "./entities/Camera";
import GameManager from "./entities/GameManager";
import MainLight from "./entities/MainLight";
import Paddle from "./entities/Paddle";

export default defineScene(() => {
  withName("Breakout Scene");
  return [Camera, MainLight, GameManager, Paddle, BrickGrid, Ball];
});
