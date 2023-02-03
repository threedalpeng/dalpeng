import { vec3 } from "@dalpeng/math";
import useSphere from "../../composables/render/useSphere";
import {
  defineGameEntity,
  Transform,
  withName,
  useComponent,
  onUpdate,
} from "dalpeng";

export default defineGameEntity(() => {
  withName("Sphere");

  const transform = useComponent(Transform);
  transform.position = vec3(-3, 0, 2);

  const renderer = useSphere();
  renderer.material.baseColor = vec3(0, 1, 0);
  renderer.material.metallic = 0.2;
  renderer.material.roughness = 0.4;
});
