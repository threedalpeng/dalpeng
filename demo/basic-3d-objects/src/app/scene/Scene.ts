import { defineScene, withName } from "dalpeng";
import Camera from "./entities/Camera";
import Group from "./entities/Group";
import Light1 from "./entities/Light1";
import Light2 from "./entities/Light2";

export default defineScene(() => {
  withName("Basic 3D Objects Scene");

  return [Group, Light1, Camera, Light2];
});
