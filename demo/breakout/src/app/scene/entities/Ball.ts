import { vec3 } from "@dalpeng/math";
import {
  defineGameEntity,
  Input,
  Light,
  Transform,
  useComponent,
  useMesh,
  withName,
  withTag,
} from "dalpeng";
import useBallPhysics from "@app/composables/useBallPhysics";

export default defineGameEntity(() => {
  withName("Ball");
  withTag("ball");

  const transform = useComponent(Transform);
  transform.position = vec3(0, -4.5, 0);
  transform.scale = vec3(0.15, 0.15, 0.15);

  const renderer = useMesh("sphere");
  renderer.material.baseColor = vec3(0, 0, 0);
  renderer.material.emissive = vec3(1, 0.9, 0.3);

  const light = useComponent(Light);
  light.type = "point";
  light.intensity = 15;
  light.color = vec3(1, 0.9, 0.3);

  useBallPhysics();
});
