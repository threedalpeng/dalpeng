import { vec3, type Vec3 } from "@dalpeng/math";
import {
  defineGameEntity,
  destroy,
  Easings,
  onDestroy,
  spawn,
  Transform,
  useComponent,
  useMesh,
  useTween,
  withName,
  withTag,
} from "dalpeng";
import { createPowerUp, type PowerUpEffect } from "./PowerUp";

const POWERUP_CHANCE = 0.25;
const EFFECTS: PowerUpEffect[] = ["wide-paddle", "fast-ball"];

export function createBrick(x: number, y: number, color: Vec3) {
  return defineGameEntity(() => {
    withName("Brick");
    withTag("brick");

    const transform = useComponent(Transform);
    transform.position = vec3(x, y, 0);
    transform.scale = vec3(0.9, 0.3, 0.25);

    const renderer = useMesh("box");
    renderer.material.baseColor = color;
    renderer.material.metallic = 0.3;
    renderer.material.roughness = 0.5;

    onDestroy(() => {
      // Power-up drop
      if (Math.random() < POWERUP_CHANCE) {
        const effect = EFFECTS[Math.floor(Math.random() * EFFECTS.length)];
        const p = transform.position;
        spawn(createPowerUp(p.x, p.y, color, effect));
      }

      // Break effect: spawn a visual-only copy that shrinks + flashes
      const pos = transform.position;
      const col = color;
      spawn(defineGameEntity(() => {
        withName("BrickBreakEffect");
        const t = useComponent(Transform);
        t.position = vec3(pos.x, pos.y, pos.z);
        t.scale = vec3(0.9, 0.3, 0.25);
        const r = useMesh("box");
        r.material.baseColor = col;
        r.material.emissive = col;

        const vals = { sx: 0.9, sy: 0.3, sz: 0.25, emit: 1.0 };
        const tweenHandle = useTween();
        tweenHandle.tween(vals, {
          to: { sx: 0, sy: 0, sz: 0, emit: 3.0 },
          duration: 200,
          easing: Easings.easeInBack,
          onUpdate() {
            t.scale = vec3(vals.sx, vals.sy, vals.sz);
            r.material.emissive = vec3(col.x * vals.emit, col.y * vals.emit, col.z * vals.emit);
          },
          onComplete() { destroy(); },
        });
      }));
    });
  });
}
