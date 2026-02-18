import { vec3 } from "@dalpeng/math";
import { defineGameEntity, Light, Transform, useComponent, withName } from "dalpeng";

export default defineGameEntity(() => {
  withName("MainLight");

  const transform = useComponent(Transform);
  transform.position = vec3(0, 5, 10);
  transform.lookAt(vec3(0, 0, 0));

  const light = useComponent(Light);
  light.type = "directional";
  light.intensity = 2;
  light.color = vec3(1, 1, 1);
});
