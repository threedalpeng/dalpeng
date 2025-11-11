import { defineGameEntity, Transform, useComponent, withName, Camera } from "dalpeng";
import { vec3 } from "@dalpeng/math";

export default defineGameEntity(() => {
  withName("Main Camera");

  const transform = useComponent(Transform);
  transform.position = vec3(0, 0, 8);

  const cam = useComponent(Camera);
  cam.isOrthographic = true;
  cam.size = 6; // world half-height
});

