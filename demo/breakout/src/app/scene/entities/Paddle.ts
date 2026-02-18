import { vec3 } from "@dalpeng/math";
import { defineGameEntity, Transform, useComponent, useMesh, withName, withTag } from "dalpeng";
import usePaddleControl from "@app/composables/usePaddleControl";

export default defineGameEntity(() => {
  withName("Paddle");
  withTag("paddle");

  const transform = useComponent(Transform);
  transform.position = vec3(0, -5, 0);
  transform.scale = vec3(1.0, 0.15, 0.25);

  const renderer = useMesh("box");
  renderer.material.baseColor = vec3(0.8, 0.8, 0.9);
  renderer.material.metallic = 0.6;
  renderer.material.roughness = 0.3;

  usePaddleControl();
});
