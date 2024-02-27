import { defineApp, withName } from "dalpeng";
import Scene from "./scene/Scene";

export default defineApp(() => {
  withName("Basic 3D Objects Application");
  return Scene;
});
