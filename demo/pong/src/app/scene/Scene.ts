import { defineScene, withName } from "dalpeng";
import Ball from "./entities/Ball";
import Camera from "./entities/Camera";
import Light from "./entities/Light";
import PaddleLeft from "./entities/PaddleLeft";
import PaddleRight from "./entities/PaddleRight";

export default defineScene(() => {
  withName("Pong Scene");
  return [Camera(), Light(), PaddleLeft(), PaddleRight(), Ball()];
});
