import { defineApp, withName } from "dalpeng";
import Scene from "./scene/Scene";

export default defineApp(() => {
  withName("glTF Viewer");
  return Scene;
});
