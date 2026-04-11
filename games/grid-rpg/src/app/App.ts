import { defineApp, withFeatures, withName } from "dalpeng";
import Scene from "./scene/Scene";

export default defineApp(() => {
  withName("Grid RPG");
  withFeatures({
    shadows: false,
    ibl: false,
    bloom: false,
    ssao: false,
    postToneMapping: false,
  });
  return Scene;
});
