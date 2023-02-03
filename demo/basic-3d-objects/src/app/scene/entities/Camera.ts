import { vec3 } from "@dalpeng/math";
import {
  Camera,
  defineGameEntity,
  Input,
  onUpdate,
  Transform,
  useComponent,
  withName,
} from "dalpeng";

export default defineGameEntity(() => {
  withName("Camera");

  const transform = useComponent(Transform);
  transform.position = vec3(0, 2, 10);

  const camera = useComponent(Camera);
  camera.size = 10;

  onUpdate(() => {
    if (Input.keyDown("KeyA")) {
      camera.isOrthographic = !camera.isOrthographic;
    } else if (Input.keyDown("KeyI")) {
      camera.size += 1;
    } else if (Input.keyDown("KeyK")) {
      camera.size -= 1;
    }
  });
});
