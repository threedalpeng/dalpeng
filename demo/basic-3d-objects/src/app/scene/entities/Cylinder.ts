import { vec3 } from "@dalpeng/math";
import { defineGameEntity, Transform, useComponent, withName } from "dalpeng";
import useCylinder from "../../composables/render/useCylinder";

export default defineGameEntity(() => {
  withName("Cylinder");

  const transform = useComponent(Transform);
  transform.position = vec3(3, 0, 2);

  const renderer = useCylinder();
  renderer.material.baseColor = vec3(1, 0.3, 0);
  renderer.material.metallic = 0.2;
  renderer.material.roughness = 0.4;
});
