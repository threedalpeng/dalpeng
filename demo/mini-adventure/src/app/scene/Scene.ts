import { defineScene, withName } from "dalpeng";
import Camera from "./entities/Camera";
import Character from "./entities/Character";
import Ground from "./entities/Ground";
import Light from "./entities/Light";

export default defineScene(() => {
  withName("Adventure Scene");
  return [Character, Ground, Camera, Light];
});
