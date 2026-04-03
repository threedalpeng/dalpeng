import { vec3 } from "@dalpeng/math";
import { Camera, defineGameEntity, Transform, useComponent, withName } from "dalpeng";

export default defineGameEntity(() => {
  withName("Camera");

  useComponent(Transform, (t) => {
    t.position = vec3(0, 0, 15);
    t.lookAt(vec3(0, 0, 0));
  });

  useComponent(Camera, (c) => {
    c.isOrthographic = true;
    c.size = 7;
  });
});
