import { vec3 } from "@dalpeng/math";
import { defineEntity, Light, Transform, useComponent, withName } from "dalpeng";

export default defineEntity(() => {
  withName("Light");

  useComponent(Transform, (t) => {
    t.position = vec3(0, 5, 5);
  });

  useComponent(Light, (l) => {
    l.type = "directional";
    l.color = vec3(1, 1, 1);
    l.intensity = 1.0;
  });
});
