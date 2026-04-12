import { vec3 } from "@dalpeng/math";
import { defineEntity, Transform, useComponent, useMesh, withName } from "dalpeng";

export default defineEntity(() => {
  withName("Box");

  useComponent(Transform, (t) => {
    t.position = vec3(0, 0, 0);
  });

  useMesh("box", (r) => {
    r.material.baseColor = vec3(0, 1, 1);
    r.material.metallic = 0.2;
    r.material.roughness = 0.4;
  });
});
