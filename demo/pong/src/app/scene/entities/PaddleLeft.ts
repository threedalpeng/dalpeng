import { defineGameEntity, Transform, withName, useComponent } from "dalpeng";
import { vec3 } from "@dalpeng/math";
import useQuad from "@app/composables/render/useQuad";
import usePaddle from "@app/composables/logic/usePaddle";
import { withTag } from "dalpeng";

export default defineGameEntity(() => {
  withName("PaddleLeft");

  const t = useComponent(Transform);
  t.position = vec3(-7, 0, 0);
  t.scale = vec3(0.5, 2, 1);

  const r = useQuad();
  r.material.baseColor = vec3(0.9, 0.9, 0.9);

  usePaddle({ upKey: "KeyW", downKey: "KeyS", speed: 6, boundsY: 5.5 });

  // Tag for lookup
  withTag("paddle-left");
});
