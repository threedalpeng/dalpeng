import { defineScene, withName } from "dalpeng";
import Camera from "./entities/Camera";
import Ground from "./entities/Ground";
import Light from "./entities/Light";
import TexturedBox from "./entities/TexturedBox";
import TexturedSphere from "./entities/TexturedSphere";

export default defineScene(() => {
  withName("Textured Scene");

  return [TexturedBox(), TexturedSphere(), Ground(), Camera(), Light()];
});
