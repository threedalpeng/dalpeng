import usePaddleControl from "@app/composables/usePaddleControl";
import { vec3 } from "@dalpeng/math";
import { defineEntity, Transform, useComponent, useMesh, withName, withTag } from "dalpeng";

export default defineEntity(() => {
  withName("Paddle");
  withTag("paddle");

  useComponent(Transform, (t) => {
    t.position = vec3(0, -5, 0);
    t.scale = vec3(1.0, 0.15, 0.25);
  });

  useMesh("box", (r) => {
    r.material.baseColor = vec3(0.8, 0.8, 0.9);
    r.material.metallic = 0.6;
    r.material.roughness = 0.3;
  });

  usePaddleControl();
});
