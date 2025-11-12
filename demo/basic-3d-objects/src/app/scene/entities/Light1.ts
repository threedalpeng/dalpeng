import { vec3 } from "@dalpeng/math";
import { Light, Transform, defineGameEntity, useComponent, withName } from "dalpeng";

export default defineGameEntity(() => {
  withName("Light1");

  const transform = useComponent(Transform);
  const light = useComponent(Light);

  transform.position = vec3(1, 3, 1);
  transform.rotate(vec3(1, 1, 0), 90);

  light.intensity = 30;
  light.color = vec3(1, 0.2, 0.6);
  light.type = "point";
});
