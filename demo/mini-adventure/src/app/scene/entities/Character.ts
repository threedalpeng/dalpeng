import { vec3 } from "@dalpeng/math";
import {
  defineEntity,
  onStart,
  spawnModelEntities,
  Transform,
  useComponent,
  useModel,
  withName,
  withTag,
} from "dalpeng";
import useCharacterController from "../../composables/useCharacterController";

export default defineEntity(() => {
  withName("Character");
  withTag("character");

  const transform = useComponent(Transform);
  transform.scale = vec3(0.02, 0.02, 0.02);

  const model = useModel("/models/Fox.glb");

  useCharacterController();

  onStart(async () => {
    try {
      await model.ready;
      if (model.asset) {
        spawnModelEntities(model.asset, transform.gameEntity);
      }
    } catch (e) {
      console.error("Character model load failed:", e);
    }
  });
});
