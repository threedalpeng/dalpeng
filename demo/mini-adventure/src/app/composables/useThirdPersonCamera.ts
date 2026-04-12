import { vec3 } from "@dalpeng/math";
import { onUpdate, Transform, useComponent, useInput } from "dalpeng";
import { cameraDistance, cameraHeight } from "./characterConfig";

export let cameraYaw = 0;

export default function useThirdPersonCamera() {
  const transform = useComponent(Transform);
  const input = useInput();

  let pitch = 0.3;
  let radius = cameraDistance.value;
  let targetTransform: Transform | null = null;

  onUpdate(() => {
    if (!targetTransform) {
      const chars = transform.gameEntity.scene?.findByTag("character");
      if (chars && chars.length > 0) {
        targetTransform = chars[0].getComponent(Transform);
      }
      if (!targetTransform) return;
    }

    if (input.mousePressed(0)) {
      const delta = input.getCursorDelta();
      if (delta.x !== 0 || delta.y !== 0) {
        cameraYaw -= delta.x * 0.005;
        pitch += delta.y * 0.005;
        pitch = Math.max(-0.17, Math.min(1.4, pitch)); // ~-10° to ~80°
      }
    }

    const scroll = input.getScrollDelta();
    if (scroll !== 0) {
      radius *= 1 + scroll * 0.001;
      radius = Math.max(2, Math.min(20, radius));
      cameraDistance.value = radius;
    }

    const targetPos = targetTransform.worldPosition;
    radius = cameraDistance.value;
    const lookTarget = targetPos.add(vec3(0, cameraHeight.value, 0));

    const x = Math.sin(cameraYaw) * Math.cos(pitch) * radius;
    const y = Math.sin(pitch) * radius;
    const z = Math.cos(cameraYaw) * Math.cos(pitch) * radius;

    transform.position = lookTarget.add(vec3(x, y, z));
    transform.lookAt(lookTarget);
  });
}
