import { vec3 } from "@dalpeng/math";
import { defineEntity, Transform, useComponent, useMesh, withName } from "dalpeng";

export default defineEntity(() => {
  withName("Ground");

  useComponent(Transform, (t) => {
    t.position = vec3(0, 0, 0);
    t.scale = vec3(50, 0.05, 50);
  });

  useMesh("box", (r) => {
    r.material.baseColor = vec3(0.15, 0.35, 0.1);
    r.material.metallic = 0;
    r.material.roughness = 0.95;
  });
});
