import { vec3 } from "@dalpeng/math";
import {
  Camera,
  defineGameEntity,
  onUpdate,
  Transform,
  useComponent,
  useInput,
  withName,
} from "dalpeng";

export default defineGameEntity(() => {
  withName("Camera");

  const transform = useComponent(Transform);

  useComponent(Camera, (c) => {
    c.size = 10;
  });

  const input = useInput();

  let yaw = 0;
  let pitch = 0.4;
  let radius = 5;
  const target = vec3(0, 0, 0);

  const updateCamera = () => {
    const x = Math.sin(yaw) * Math.cos(pitch) * radius;
    const y = Math.sin(pitch) * radius;
    const z = Math.cos(yaw) * Math.cos(pitch) * radius;
    transform.position = vec3(target.x + x, target.y + y, target.z + z);
    transform.lookAt(target);
  };
  updateCamera();

  onUpdate(() => {
    let changed = false;

    if (input.mousePressed(0)) {
      const delta = input.getCursorDelta();
      if (delta.x !== 0 || delta.y !== 0) {
        yaw -= delta.x * 0.005;
        pitch += delta.y * 0.005;
        pitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, pitch));
        changed = true;
      }
    }

    if (input.mousePressed(1)) {
      const delta = input.getCursorDelta();
      if (delta.x !== 0 || delta.y !== 0) {
        const right = vec3(Math.cos(yaw), 0, -Math.sin(yaw));
        const up = vec3(0, 1, 0);
        const panSpeed = radius * 0.003;
        target.x -= right.x * delta.x * panSpeed + up.x * delta.y * panSpeed;
        target.y += delta.y * panSpeed;
        target.z -= right.z * delta.x * panSpeed + up.z * delta.y * panSpeed;
        changed = true;
      }
    }

    const scroll = input.getScrollDelta();
    if (scroll !== 0) {
      radius *= 1 + scroll * 0.001;
      radius = Math.max(0.5, Math.min(50, radius));
      changed = true;
    }

    if (input.keyPressed("ArrowLeft")) {
      yaw += 0.02;
      changed = true;
    }
    if (input.keyPressed("ArrowRight")) {
      yaw -= 0.02;
      changed = true;
    }
    if (input.keyPressed("ArrowUp")) {
      pitch += 0.02;
      pitch = Math.min(pitch, Math.PI / 2 - 0.01);
      changed = true;
    }
    if (input.keyPressed("ArrowDown")) {
      pitch -= 0.02;
      pitch = Math.max(pitch, -Math.PI / 2 + 0.01);
      changed = true;
    }

    if (changed) {
      updateCamera();
    }
  });
});
