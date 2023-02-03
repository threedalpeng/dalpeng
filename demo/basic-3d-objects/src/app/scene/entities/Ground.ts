import { vec3 } from "@dalpeng/math";
import { defineGameEntity, Transform, useComponent, withName } from "dalpeng";
import useBox from "../../composables/render/useBox";

export default defineGameEntity(() => {
  withName("Ground");

  const transform = useComponent(Transform);
  transform.position = vec3(0, -1.5, 0);
  transform.scale = vec3(5, 0.5, 5);

  const renderer = useBox();
  renderer.material.baseColor = vec3(1, 1, 1);
  renderer.material.metallic = 1;
  renderer.material.roughness = 1;
});
