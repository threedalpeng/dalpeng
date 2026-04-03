import {
  defineGameEntity,
  onStart,
  Transform,
  useComponent,
  useModel,
  spawnModelEntities,
  withName,
  vec3,
} from "dalpeng";

export default defineGameEntity(() => {
  withName("GLTFModel");

  const transform = useComponent(Transform);
  transform.scale = vec3(0.02, 0.02, 0.02);

  const model = useModel("/models/Fox.glb");

  onStart(async () => {
    try {
      await model.ready;
      if (model.asset) {
        spawnModelEntities(model.asset, transform.gameEntity);
      } else {
        console.warn("[DEBUG] GLTFModel model.asset is null!");
      }
    } catch (e) {
      console.error("[DEBUG] GLTFModel onStart error:", e);
    }
  });
});
