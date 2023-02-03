import { vec3 } from "@dalpeng/math";
import { defineGameEntity, Transform, useComponent, withName } from "dalpeng";
import useBox from "../../composables/render/useBox";

export default defineGameEntity(() => {
  withName("Box");

  const transform = useComponent(Transform);
  transform.position = vec3(0, 0, 0);

  const renderer = useBox();
  renderer.material.baseColor = vec3(0, 1, 1);
  renderer.material.metallic = 0.2;
  renderer.material.roughness = 0.4;
});
