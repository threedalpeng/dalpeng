import usePaddle from "@app/composables/logic/usePaddle";
import useQuad from "@app/composables/render/useQuad";
import { vec3 } from "@dalpeng/math";
import { defineEntity, Transform, useComponent, withName, withTag } from "dalpeng";

export default defineEntity(() => {
  withName("PaddleLeft");

  useComponent(Transform, (t) => {
    t.position = vec3(-7, 0, 0);
    t.scale = vec3(0.5, 2, 1);
  });

  useQuad().material.baseColor = vec3(0.9, 0.9, 0.9);

  usePaddle({ upKey: "KeyW", downKey: "KeyS", speed: 6, boundsY: 5 });

  // Tag for lookup
  withTag("paddle-left");
});
