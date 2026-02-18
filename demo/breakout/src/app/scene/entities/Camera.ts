import { vec3 } from "@dalpeng/math";
import { Camera, defineGameEntity, Transform, useComponent, withName } from "dalpeng";

export default defineGameEntity(() => {
  withName("Camera");

  const transform = useComponent(Transform);
  transform.position = vec3(0, 0, 15);
  transform.lookAt(vec3(0, 0, 0));

  const camera = useComponent(Camera);
  camera.isOrthographic = true;
  camera.size = 7;
});
