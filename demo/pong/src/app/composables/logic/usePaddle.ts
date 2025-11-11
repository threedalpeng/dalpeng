import { Input, Time, Transform, useComponent } from "dalpeng";
import { vec3 } from "@dalpeng/math";

type UsePaddleConfig = {
  upKey: string;
  downKey: string;
  speed?: number; // world units per second
  boundsY?: number; // clamp extent
  onUpdate?: (t: Transform) => void;
};

import { onUpdate } from "dalpeng";

const DEFAULT_SPEED = 6;
const DEFAULT_BOUNDS_Y = 5.5;

export default function usePaddle(cfg: UsePaddleConfig) {
  const t = useComponent(Transform);
  const speed = cfg.speed ?? DEFAULT_SPEED;
  const boundsY = cfg.boundsY ?? DEFAULT_BOUNDS_Y;

  onUpdate(() => {
    const dt = Time.delta() * 0.001;
    let dy = 0;
    if (Input.keyPressed(cfg.upKey)) dy += speed * dt;
    if (Input.keyPressed(cfg.downKey)) dy -= speed * dt;
    if (dy !== 0) {
      const p = t.position;
      const ny = Math.max(-boundsY, Math.min(boundsY, p.y + dy));
      t.position = vec3(p.x, ny, p.z);
    }
    cfg.onUpdate?.(t);
  });

  return t;
}

