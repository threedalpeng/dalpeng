import { defineScene, withName } from "dalpeng";
import Camera from "./entities/Camera";
import GLTFModel from "./entities/GLTFModel";
import Ground from "./entities/Ground";
import Light from "./entities/Light";

export default defineScene(() => {
  withName("glTF Viewer Scene");
  return [GLTFModel(), Ground(), Camera(), Light()];
});
