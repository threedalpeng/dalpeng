import { vec3 } from "@dalpeng/math";
import { Light, Time, Transform, defineGameEntity, onUpdate, useComponent, withName } from "dalpeng";

export default defineGameEntity(() => {
  withName("Light2");

  const transform = useComponent(Transform);
  // Position is irrelevant for directional lights, but harmless to set.
  transform.position = vec3(3, 4, 4);
  // Aim the light slightly downward and from the side.
  transform.rotate(vec3(1, 0, 0), -45);

  const light = useComponent(Light);
  light.type = "directional";
  light.intensity = 1.0;
  light.color = vec3(0.8, 0.9, 1.0);
  onUpdate(() => {
    // Orbit the light around world origin on Y axis
    transform.rotateAround(vec3(0, 0, 0), vec3(0, 1, 0), 0.1 * Time.delta());
  });
});
