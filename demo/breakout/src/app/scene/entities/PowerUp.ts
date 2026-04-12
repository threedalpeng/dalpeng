import { addLife, setSpeedMultiplier, speedMultiplier } from "@app/composables/useGameState";
import { vec3, type Vec3 } from "@dalpeng/math";
import {
  defineGameEntity,
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

export type PowerUpEffect =
  | "wide-paddle"
  | "fast-ball"
  | "slow-ball"
  | "extra-life"
  | "shrink-paddle";

type PowerUpVisual = {
  color: Vec3;
  mesh: "box" | "sphere" | "cylinder";
  scale: Vec3;
};

const EFFECT_VISUALS: Record<PowerUpEffect, PowerUpVisual> = {
  "wide-paddle": { color: vec3(0.2, 0.6, 1.0), mesh: "box", scale: vec3(0.3, 0.15, 0.15) },
  "shrink-paddle": { color: vec3(0.8, 0.2, 0.8), mesh: "box", scale: vec3(0.12, 0.25, 0.12) },
  "fast-ball": { color: vec3(1.0, 0.3, 0.1), mesh: "cylinder", scale: vec3(0.15, 0.25, 0.15) },
  "slow-ball": { color: vec3(0.3, 1.0, 0.4), mesh: "sphere", scale: vec3(0.2, 0.2, 0.2) },
  "extra-life": { color: vec3(1.0, 0.9, 0.2), mesh: "sphere", scale: vec3(0.25, 0.25, 0.25) },
};

export function createPowerUp(x: number, y: number, effect: PowerUpEffect) {
  const visual = EFFECT_VISUALS[effect];
  return defineGameEntity(() => {
    withName("PowerUp");
    withTag("powerup");

    const transform = useComponent(Transform, (t) => {
      t.position = vec3(x, y, 0);
      t.scale = visual.scale;
    });

    useMesh(visual.mesh, (r) => {
      r.material.baseColor = vec3(0, 0, 0);
      r.material.emissive = visual.color;
    });

    useComponent(Light, (l) => {
      l.type = "point";
      l.intensity = 8;
      l.color = visual.color;
    });

    const self = transform.gameEntity;

    onUpdate(() => {
      const dt = Time.delta() * 0.001;
      const p = transform.position;
      const ny = p.y - FALL_SPEED * dt;

      transform.rotate(vec3(0, 1, 0), dt * 180);

      const scene = self.scene;
      const paddles = scene.findByTag("paddle");
      if (paddles.length > 0) {
        const pt = paddles[0].getComponent(Transform)!;
        const pp = pt.position;
        const ps = pt.scale;

        if (p.x > pp.x - ps.x && p.x < pp.x + ps.x && ny < pp.y + ps.y && ny > pp.y - ps.y) {
          applyEffect(effect, pt);
          self.currentApp.destroy(self);
          return;
        }
      }

      if (ny < BOUNDS_Y_BOTTOM) {
        self.currentApp.destroy(self);
        return;
      }

      transform.position = vec3(p.x, ny, p.z);
    });
  });
}

function applyEffect(effect: PowerUpEffect, paddleTransform: Transform) {
  const ps = paddleTransform.scale;
  switch (effect) {
    case "wide-paddle":
      paddleTransform.scale = vec3(Math.min(ps.x + 0.3, 2.0), ps.y, ps.z);
      break;
    case "shrink-paddle":
      paddleTransform.scale = vec3(Math.max(ps.x - 0.3, 0.5), ps.y, ps.z);
      break;
    case "fast-ball":
      setSpeedMultiplier(speedMultiplier.value + 0.25);
      break;
    case "slow-ball":
      setSpeedMultiplier(speedMultiplier.value - 0.25);
      break;
    case "extra-life":
      addLife();
      break;
  }
}
