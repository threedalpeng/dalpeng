import { defineScene, withName } from "dalpeng";
import Camera from "./entities/Camera";
import PaddleLeft from "./entities/PaddleLeft";
import PaddleRight from "./entities/PaddleRight";
import Ball from "./entities/Ball";
import Light from "./entities/Light";

export default defineScene(() => {
  withName("Pong Scene");
  return [Camera, Light, PaddleLeft, PaddleRight, Ball];
});

