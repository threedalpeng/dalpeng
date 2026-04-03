import { vec3 } from "@dalpeng/math";
import { Time, Transform, useComponent, onUpdate, useInput } from "dalpeng";

const SPEED = 10;
const BOUNDS_X = 7;

export default function usePaddleControl() {
  const transform = useComponent(Transform);
  const input = useInput();

  onUpdate(() => {
    const dt = Time.delta() * 0.001;
    let dx = 0;
    if (input.actionPressed("move-left")) dx -= SPEED * dt;
    if (input.actionPressed("move-right")) dx += SPEED * dt;
    if (dx !== 0) {
      const p = transform.position;
      const nx = Math.max(-BOUNDS_X, Math.min(BOUNDS_X, p.x + dx));
      transform.position = vec3(nx, p.y, p.z);
    }
  });

  return transform;
}
