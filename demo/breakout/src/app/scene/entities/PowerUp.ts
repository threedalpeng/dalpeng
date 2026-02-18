import { vec3, type Vec3 } from "@dalpeng/math";
import {
  defineGameEntity,
  destroy,
  Light,
  onUpdate,
  Time,
  Transform,
  useComponent,
  useMesh,
  withName,
  withTag,
} from "dalpeng";

const FALL_SPEED = 3;
const BOUNDS_Y_BOTTOM = -7;

export type PowerUpEffect = "wide-paddle" | "fast-ball";

export function createPowerUp(x: number, y: number, color: Vec3, effect: PowerUpEffect) {
  return defineGameEntity(() => {
    withName("PowerUp");
    withTag("powerup");

    const transform = useComponent(Transform);
    transform.position = vec3(x, y, 0);
    transform.scale = vec3(0.2, 0.2, 0.2);

    const renderer = useMesh("sphere");
    renderer.material.baseColor = vec3(0, 0, 0);
    renderer.material.emissive = color;

    const light = useComponent(Light);
    light.type = "point";
    light.intensity = 8;
    light.color = color;

    onUpdate(() => {
      const dt = Time.delta() * 0.001;
      const p = transform.position;
      const ny = p.y - FALL_SPEED * dt;

      // Check paddle collision
      const scene = transform.gameEntity.scene;
      const paddles = scene.findByTag("paddle");
      if (paddles.length > 0) {
        const pt = paddles[0].getComponent(Transform)!;
        const pp = pt.position;
        const ps = pt.scale;

        if (
          p.x > pp.x - ps.x &&
          p.x < pp.x + ps.x &&
          ny < pp.y + ps.y &&
          ny > pp.y - ps.y
        ) {
          // Apply effect
          if (effect === "wide-paddle") {
            pt.scale = vec3(Math.min(ps.x + 0.25, 2.0), ps.y, ps.z);
            console.log("[Breakout] Power-up: Wide Paddle!");
          } else if (effect === "fast-ball") {
            console.log("[Breakout] Power-up: Fast Ball!");
          }
          destroy();
          return;
        }
      }

      // Out of bounds
      if (ny < BOUNDS_Y_BOTTOM) {
        destroy();
        return;
      }

      transform.position = vec3(p.x, ny, p.z);
    });
  });
}
