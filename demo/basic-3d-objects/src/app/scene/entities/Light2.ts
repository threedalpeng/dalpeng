import {
  Light,
  Transform,
  defineGameEntity,
  useComponent,
  withName,
} from "dalpeng";
import { vec3 } from "@dalpeng/math";

export default defineGameEntity(() => {
  withName("Light2");

  const transform = useComponent(Transform);
  // Position is irrelevant for directional lights, but harmless to set.
  transform.position = vec3(3, 0, 4);
  // Aim the light slightly downward and from the side.
  transform.rotate(vec3(1, 0, 0), 45);
  // transform.rotate(vec3(0, 1, 0), 30);

  const light = useComponent(Light);
  light.type = "directional";
  light.intensity = 1.0;
  light.color = vec3(0.8, 0.9, 1.0);
});
