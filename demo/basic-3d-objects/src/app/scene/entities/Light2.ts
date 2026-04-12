import { vec3 } from "@dalpeng/math";
import {
  Light,
  Time,
  Transform,
  defineGameEntity,
  onUpdate,
  useComponent,
  withName,
} from "dalpeng";

export default defineGameEntity(() => {
  withName("Light2");

  const transform = useComponent(Transform, (t) => {
    t.position = vec3(3, 4, 4);
    t.rotate(vec3(1, 0, 0), -45);
  });

  useComponent(Light, (l) => {
    l.type = "directional";
    l.intensity = 1.0;
    l.color = vec3(0.8, 0.9, 1.0);
  });

  onUpdate(() => {
    transform.rotateAround(vec3(0, 0, 0), vec3(0, 1, 0), 0.1 * Time.delta());
  });
});
