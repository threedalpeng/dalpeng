import { vec3 } from "@dalpeng/math";
import { Light, Transform, defineEntity, useComponent, withName } from "dalpeng";

export default defineEntity(() => {
  withName("Sunlight");

  useComponent(Transform, (t) => {
    t.position = vec3(5, 10, 5);
    t.lookAt(vec3(0, 0, 0));
  });

  useComponent(Light, (l) => {
    l.intensity = 4;
    l.color = vec3(1, 0.95, 0.9);
    l.type = "directional";
  });
});
