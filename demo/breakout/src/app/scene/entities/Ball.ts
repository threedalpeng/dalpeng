import useBallPhysics from "@app/composables/useBallPhysics";
import { vec3 } from "@dalpeng/math";
import { defineEntity, Light, Transform, useComponent, useMesh, withName, withTag } from "dalpeng";

export default defineEntity(() => {
  withName("Ball");
  withTag("ball");

  useComponent(Transform, (t) => {
    t.position = vec3(0, -4.5, 0);
    t.scale = vec3(0.15, 0.15, 0.15);
  });

  useMesh("sphere", (r) => {
    r.material.baseColor = vec3(0, 0, 0);
    r.material.emissive = vec3(1, 0.9, 0.3);
  });

  useComponent(Light, (l) => {
    l.type = "point";
    l.intensity = 15;
    l.color = vec3(1, 0.9, 0.3);
  });

  useBallPhysics();
});
