import { vec3 } from "@dalpeng/math";
import { Light, Transform, defineGameEntity, useComponent, withName } from "dalpeng";

export default defineGameEntity(() => {
  withName("DirectionalLight");

  useComponent(Transform, (t) => {
    t.position = vec3(3, 5, 3);
  });

  useComponent(Light, (l) => {
    l.intensity = 5;
    l.color = vec3(1, 1, 1);
    l.type = "directional";
  });
});
