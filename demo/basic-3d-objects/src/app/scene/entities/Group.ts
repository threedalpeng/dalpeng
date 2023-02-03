import { vec3 } from "@dalpeng/math";
import {
  defineGameEntity,
  onUpdate,
  Time,
  Transform,
  useComponent,
  withName,
} from "dalpeng";
import Box from "./Box";
import Cylinder from "./Cylinder";
import Ground from "./Ground";
import Sphere from "./Sphere";

export default defineGameEntity(() => {
  withName("Group");

  const transform = useComponent(Transform);
  onUpdate(() => {
    transform.rotate(vec3(0, 1, 0), 0.01 * Time.delta());
  });

  return [Box, Ground, Cylinder, Sphere];
});
