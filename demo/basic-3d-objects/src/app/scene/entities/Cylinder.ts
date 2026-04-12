import { vec3 } from "@dalpeng/math";
import { defineEntity, Transform, useComponent, useMesh, withName } from "dalpeng";

export default defineEntity(() => {
  withName("Cylinder");

  useComponent(Transform, (t) => {
    t.position = vec3(3, 0, 2);
  });

  useMesh("cylinder", (r) => {
    r.material.baseColor = vec3(1, 0.3, 0);
    r.material.metallic = 0.2;
    r.material.roughness = 0.4;
  });
});
