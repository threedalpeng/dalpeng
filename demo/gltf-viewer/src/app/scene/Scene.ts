import { defineScene, withName } from "dalpeng";
import Camera from "./entities/Camera";
import Light from "./entities/Light";
import Ground from "./entities/Ground";
import GLTFModel from "./entities/GLTFModel";

export default defineScene(() => {
  withName("glTF Viewer Scene");
  return [GLTFModel, Ground, Camera, Light];
});
