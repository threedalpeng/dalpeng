import { defineApp, withName } from "dalpeng";
import Scene from "./scene/Scene";

export default defineApp(() => {
  withName("Textured Scene Application");
  return Scene;
});
