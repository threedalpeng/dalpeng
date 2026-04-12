import { vec3 } from "@dalpeng/math";
import { defineEntity, Transform, useComponent, useMesh, withName } from "dalpeng";

export default defineEntity(() => {
  withName("Ground");

  useComponent(Transform, (t) => {
    t.position = vec3(0, -1.5, 0);
    t.scale = vec3(5, 0.1, 5);
  });

  useMesh("box", (r) => {
    r.material.baseColor = vec3(0.3, 0.3, 0.3);
    r.material.metallic = 0;
    r.material.roughness = 0.9;
  });
});
