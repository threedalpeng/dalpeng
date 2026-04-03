import { vec3 } from "@dalpeng/math";
import { defineGameEntity, Transform, useComponent, useMesh, withName } from "dalpeng";

export default defineGameEntity(() => {
  withName("Sphere");

  useComponent(Transform, (t) => {
    t.position = vec3(-3, 0, 2);
  });

  useMesh("sphere", (r) => {
    r.material.baseColor = vec3(0, 1, 0);
    r.material.metallic = 0.2;
    r.material.roughness = 0.4;
  });
});
