import { defineGameEntity, Light, Transform, useComponent, withName } from "dalpeng";
import { vec3 } from "@dalpeng/math";

export default defineGameEntity(() => {
  withName("Light");

  const t = useComponent(Transform);
  t.position = vec3(0, 5, 5);

  const l = useComponent(Light);
  l.type = "directional";
  l.color = vec3(1, 1, 1);
  l.intensity = 1.0;
});

