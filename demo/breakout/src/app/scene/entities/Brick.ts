import { vec3, type Vec3 } from "@dalpeng/math";
import {
  defineGameEntity,
  Easings,
  MeshRenderer,
  onDestroy,
  ParticleEmitter,
  spawn,
  Transform,
  useComponent,
  useMesh,
  useTween,
  withName,
  withTag,
  type GameEntity,
} from "dalpeng";
import { createPowerUp, type PowerUpEffect } from "./PowerUp";

const POWERUP_CHANCE = 0.25;
const EFFECTS: PowerUpEffect[] = ["wide-paddle", "fast-ball", "slow-ball", "extra-life", "shrink-paddle"];

const _brickHP = new WeakMap<GameEntity, number>();
const _brickBaseColor = new WeakMap<GameEntity, Vec3>();

export function takeDamage(brick: GameEntity) {
  const hp = (_brickHP.get(brick) ?? 1) - 1;
  if (hp <= 0) {
    brick.currentApp.destroy(brick);
    return;
  }
  _brickHP.set(brick, hp);
  // Dim color to indicate damage
  const base = _brickBaseColor.get(brick);
  if (base) {
    const renderer = brick.getComponent(MeshRenderer);
    if (renderer) {
      renderer.material.baseColor = vec3(base.x * 0.5, base.y * 0.5, base.z * 0.5);
    }
  }
}

export function createBrick(x: number, y: number, color: Vec3, hitPoints = 1) {
  return defineGameEntity(() => {
    withName("Brick");
    withTag("brick");

    const transform = useComponent(Transform, (t) => {
      t.position = vec3(x, y, 0);
      t.scale = vec3(0.9, 0.3, 0.25);
    });

    useMesh("box", (r) => {
      r.material.baseColor = color;
      r.material.metallic = 0.3;
      r.material.roughness = 0.5;
    });

    const self = transform.gameEntity;
    _brickHP.set(self, hitPoints);
    _brickBaseColor.set(self, color);

    onDestroy(() => {
      // Power-up drop
      if (Math.random() < POWERUP_CHANCE) {
        const effect = EFFECTS[Math.floor(Math.random() * EFFECTS.length)];
        const p = transform.position;
        spawn(createPowerUp(p.x, p.y, effect));
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

        const self = t.gameEntity;
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
          onComplete() { self.currentApp.destroy(self); },
        });
      }));
      // Particle burst
      spawn(defineGameEntity(() => {
        withName("BrickParticle");
        const pt = useComponent(Transform);
        pt.position = vec3(pos.x, pos.y, pos.z);

        const emitter = useComponent(ParticleEmitter);
        emitter.configure({
          maxParticles: 20,
          lifetime: [200, 400],
          speed: [2, 5],
          colorStart: [col.x, col.y, col.z, 1],
          colorEnd: [col.x, col.y, col.z, 0],
          spread: Math.PI,
          gravity: [0, -8, 0],
          sizeRange: [0.15, 0.02],
        });
        emitter.burst(20);

        const pSelf = pt.gameEntity;
        const pTween = useTween();
        pTween.tween({ t: 0 }, {
          to: { t: 1 },
          duration: 500,
          onComplete() { pSelf.currentApp.destroy(pSelf); },
        });
      }));
    });
  });
}
