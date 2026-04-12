import { vec3 } from "@dalpeng/math";
import { Camera, defineGameEntity, onUpdate, Transform, useComponent, withName } from "dalpeng";

export default defineGameEntity(() => {
  withName("Camera");

  const transform = useComponent(Transform, (t) => {
    t.position = vec3(3, 3, 5);
    t.lookAt(vec3(0, 0, 0));
  });

  useComponent(Camera, (c) => {
    c.fov = 60;
    c.near = 0.1;
    c.far = 100;
  });

  let angle = 0;
  onUpdate(() => {
    angle += 0.005;
    const radius = 6;
    transform.position = vec3(Math.cos(angle) * radius, 3, Math.sin(angle) * radius);
    transform.lookAt(vec3(0, 0, 0));
  });
});
