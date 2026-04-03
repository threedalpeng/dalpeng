import { vec3 } from "@dalpeng/math";
import { defineGameEntity, Transform, useComponent, useMesh, withName } from "dalpeng";

export default defineGameEntity(() => {
  withName("Ground");

  useComponent(Transform, (t) => {
    t.position = vec3(0, -1.5, 0);
    t.scale = vec3(5, 0.5, 5);
  });

  useMesh("box", (r) => {
    r.material.baseColor = vec3(1, 1, 1);
    r.material.metallic = 1;
    r.material.roughness = 1;
  });
});
