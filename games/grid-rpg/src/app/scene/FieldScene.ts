import { defineScene, withName } from "dalpeng";
import Camera from "./entities/Camera";
import FieldPlayer from "./entities/FieldPlayer";

export default defineScene(() => {
  withName("Field Scene");

  return [FieldPlayer(), Camera()];
});
