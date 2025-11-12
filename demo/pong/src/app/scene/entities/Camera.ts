import { vec3 } from "@dalpeng/math";
import { Camera, defineGameEntity, Transform, useComponent, withName } from "dalpeng";

export default defineGameEntity(() => {
  withName("Main Camera");

  const transform = useComponent(Transform);
  transform.position = vec3(0, 0, 8);

  const cam = useComponent(Camera);
  cam.isOrthographic = true;
  cam.size = 6; // world half-height
});
