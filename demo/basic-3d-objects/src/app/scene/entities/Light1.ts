import { vec3 } from "@dalpeng/math";
import { Light, Transform, defineGameEntity, useComponent, useMesh, withName } from "dalpeng";

export default defineGameEntity(() => {
  withName("Light1");

  const transform = useComponent(Transform);
  const light = useComponent(Light);

  transform.position = vec3(1, 3, 1);
  transform.scale = vec3(0.15, 0.15, 0.15);

  light.intensity = 30;
  light.color = vec3(1, 0.2, 0.6);
  light.type = "point";

  const renderer = useMesh("sphere");
  renderer.material.emissive = light.color;
  renderer.material.baseColor = vec3(0, 0, 0);
});
