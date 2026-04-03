import { vec3 } from "@dalpeng/math";
import { defineGameEntity, Light, Transform, useComponent, withName } from "dalpeng";

export default defineGameEntity(() => {
  withName("MainLight");

  useComponent(Transform, (t) => {
    t.position = vec3(0, 5, 10);
    t.lookAt(vec3(0, 0, 0));
  });

  useComponent(Light, (l) => {
    l.type = "directional";
    l.intensity = 2;
    l.color = vec3(1, 1, 1);
  });
});
