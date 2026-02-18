import { vec3 } from "@dalpeng/math";
import { Input, Time, Transform, useComponent, onUpdate } from "dalpeng";

const SPEED = 10;
const BOUNDS_X = 7;

export default function usePaddleControl() {
  const transform = useComponent(Transform);

  onUpdate(() => {
    const dt = Time.delta() * 0.001;
    let dx = 0;
    if (Input.keyPressed("ArrowLeft")) dx -= SPEED * dt;
    if (Input.keyPressed("ArrowRight")) dx += SPEED * dt;
    if (dx !== 0) {
      const p = transform.position;
      const nx = Math.max(-BOUNDS_X, Math.min(BOUNDS_X, p.x + dx));
      transform.position = vec3(nx, p.y, p.z);
    }
  });

  return transform;
}
