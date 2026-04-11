import { defineScene, withName } from "dalpeng";
import Camera from "./entities/Camera";
import NPC from "./entities/NPC";
import Player from "./entities/Player";
import Tilemap from "./entities/Tilemap";

export default defineScene(() => {
  withName("Grid RPG Scene");

  return [Tilemap(), Player(), NPC(), Camera()];
});
