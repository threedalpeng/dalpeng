import { vec3 } from "@dalpeng/math";
import { Light, Transform, defineGameEntity, useComponent, useMesh, withName } from "dalpeng";

export default defineGameEntity(() => {
  withName("Light1");

  useComponent(Transform, (t) => {
    t.position = vec3(1, 3, 1);
    t.scale = vec3(0.15, 0.15, 0.15);
  });

  const light = useComponent(Light, (l) => {
    l.intensity = 30;
    l.color = vec3(1, 0.2, 0.6);
    l.type = "point";
  });

  useMesh("sphere", (r) => {
    r.material.emissive = light.color;
    r.material.baseColor = vec3(0, 0, 0);
  });
});
