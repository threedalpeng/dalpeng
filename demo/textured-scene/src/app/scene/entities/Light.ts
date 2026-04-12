import { vec3 } from "@dalpeng/math";
import { defineGameEntity, Light, Transform, useComponent, withName } from "dalpeng";

export default defineGameEntity(() => {
  withName("Light");

  useComponent(Transform, (t) => {
    t.position = vec3(5, 8, 5);
    // Tilt light downward so shadows project naturally onto the ground
    t.rotate(vec3(1, 0, 0), -45);
  });

  useComponent(Light, (l) => {
    l.color = vec3(1, 1, 1);
    l.intensity = 2.0;
  });
});
