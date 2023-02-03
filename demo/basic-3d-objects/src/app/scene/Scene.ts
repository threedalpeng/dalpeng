import { defineScene } from "dalpeng";
import Camera from "./entities/Camera";
import Ground from "./entities/Ground";
import Group from "./entities/Group";
import Light1 from "./entities/Light1";
import Light2 from "./entities/Light2";

export default defineScene(() => {
  return [Group, Light1, Camera, Light2];
});
