import usePaddle from "@app/composables/logic/usePaddle";
import useQuad from "@app/composables/render/useQuad";
import { vec3 } from "@dalpeng/math";
import { defineGameEntity, Transform, useComponent, withName, withTag } from "dalpeng";

export default defineGameEntity(() => {
  withName("PaddleRight");

  useComponent(Transform, (t) => {
    t.position = vec3(7, 0, 0);
    t.scale = vec3(0.5, 2, 1);
  });

  useQuad().material.baseColor = vec3(0.9, 0.9, 0.9);

  usePaddle({ upKey: "ArrowUp", downKey: "ArrowDown", speed: 6, boundsY: 5.5 });

  withTag("paddle-right");
});
