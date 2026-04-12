import { vec3 } from "@dalpeng/math";
import { defineEntity, Transform, useComponent, useMesh, withName } from "dalpeng";

export default defineEntity(() => {
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
