import { vec3 } from "@dalpeng/math";
import { Camera, defineGameEntity, Transform, useComponent, useKeyDown, withName } from "dalpeng";

export default defineGameEntity(() => {
  withName("Camera");

  useComponent(Transform, (t) => {
    t.position = vec3(0, 2, 10);
    t.lookAt(vec3(0, 0, 0));
  });

  const camera = useComponent(Camera, (c) => {
    c.size = 10;
  });

  useKeyDown("KeyA", () => {
    camera.isOrthographic = !camera.isOrthographic;
  });
  useKeyDown("KeyI", () => {
    camera.size += 1;
  });
  useKeyDown("KeyK", () => {
    camera.size -= 1;
  });
});
