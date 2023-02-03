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

  transform.position = vec3(3, 0, 4);

  // const light = useComponent(Light);

  // light.intensity = 10;
  // light.color = vec3(0.5, 1, 1);
  // light.type = "point";
});
