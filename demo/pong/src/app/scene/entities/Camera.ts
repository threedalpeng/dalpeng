import { vec3 } from "@dalpeng/math";
import { Camera, defineGameEntity, Transform, useComponent, withName } from "dalpeng";

export default defineGameEntity(() => {
  withName("Main Camera");

  useComponent(Transform, (t) => {
    t.position = vec3(0, 0, 8);
  });

  useComponent(Camera, (c) => {
    c.isOrthographic = true;
    c.size = 6; // world half-height
  });
});
