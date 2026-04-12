import type { SpriteAnimationClip } from "@dalpeng/core";
import { Sprite2DRenderer, SpriteAnimator, SpriteAtlas } from "@dalpeng/core";
import { vec3 } from "@dalpeng/math";
import {
  defineEntity,
  onStart,
  onUpdate,
  Time,
  Transform,
  useComponent,
  useInput,
  useSceneSwitch,
  useTriggerZone,
  withName,
  withTag,
} from "dalpeng";
import FieldScene from "../FieldScene";
import { tileCollider } from "../shared";

const MOVE_SPEED = 4;
const SPRITE_URL = "/assets/sprites/player.png";

// Sprite sheet row layout: 0=south, 1=north, 2=west, 3=east (Mana Seed format)
const WALK_CLIPS: SpriteAnimationClip[] = [
  { name: "idle-down", frames: [0], frameDuration: 1, loop: true },
  { name: "walk-down", frames: [32, 33, 34, 35, 36, 37], frameDuration: 0.135, loop: true },
  { name: "idle-up", frames: [8], frameDuration: 1, loop: true },
  { name: "walk-up", frames: [40, 41, 42, 43, 44, 45], frameDuration: 0.135, loop: true },
  { name: "idle-left", frames: [16], frameDuration: 1, loop: true },
  { name: "walk-left", frames: [48, 49, 50, 51, 52, 53], frameDuration: 0.135, loop: true },
  { name: "idle-right", frames: [24], frameDuration: 1, loop: true },
  { name: "walk-right", frames: [56, 57, 58, 59, 60, 61], frameDuration: 0.135, loop: true },
];

export default defineEntity(() => {
  withName("Player");
  withTag("player");

  const transform = useComponent(Transform, (t) => {
    t.position = vec3(5.5, 7.5, 0);
    t.scale = vec3(0.5, 0.5, 1); // 64px frame at 32ppu = 1 tile unit
  });

  const sprite = useComponent(Sprite2DRenderer, (s) => {
    s.pixelsPerUnit = 32;
    s.sortingLayer = 1;
  });

  const animator = useComponent(SpriteAnimator);

  for (const clip of WALK_CLIPS) {
    animator.addClip(clip);
  }

  const sceneSwitch = useSceneSwitch();

  let facing = "down";
  let exitTriggered = false;

  useTriggerZone(() => tileCollider, 0.35, 0.35, {
    onEnter: (zone) => {
      if (zone.type === "trigger" && !exitTriggered) {
        exitTriggered = true;
        sceneSwitch.switchTo(FieldScene, { type: "fade", duration: 400 });
      }
    },
  });

  onStart(async () => {
    try {
      const app = sprite.gameEntity.currentApp;
      const tex = await app.textures.load(SPRITE_URL, { srgb: true, mipmaps: false });
      sprite.atlas = SpriteAtlas.fromUniform(tex, 512, 512, 64, 64);
      animator.play("idle-down");
    } catch {
      console.warn("[Player] Could not load sprite:", SPRITE_URL);
    }
  });

  const input = useInput();

  onUpdate(() => {
    const dt = Time.delta() / 1000;
    let dx = 0;
    let dy = 0;

    if (input.keyPressed("KeyW") || input.keyPressed("ArrowUp")) dy += 1;
    if (input.keyPressed("KeyS") || input.keyPressed("ArrowDown")) dy -= 1;
    if (input.keyPressed("KeyA") || input.keyPressed("ArrowLeft")) dx -= 1;
    if (input.keyPressed("KeyD") || input.keyPressed("ArrowRight")) dx += 1;

    if (dx !== 0 || dy !== 0) {
      if (dy > 0 && dx === 0) facing = "up";
      else if (dy < 0 && dx === 0) facing = "down";
      else if (dx < 0 && dy === 0) facing = "left";
      else if (dx > 0 && dy === 0) facing = "right";
      // diagonal: keep previous facing direction
    }

    if (dx !== 0 || dy !== 0) {
      const len = Math.sqrt(dx * dx + dy * dy);
      dx = (dx / len) * MOVE_SPEED * dt;
      dy = (dy / len) * MOVE_SPEED * dt;

      const pos = transform.position;
      const halfW = 0.35;
      const halfH = 0.35;

      if (tileCollider) {
        const resolved = tileCollider.resolveAABB(pos[0], pos[1], halfW, halfH, dx, dy);
        transform.position = vec3(resolved.x, resolved.y, pos[2]);
      } else {
        transform.position = vec3(pos[0] + dx, pos[1] + dy, pos[2]);
      }

      if (animator.currentClipName !== `walk-${facing}`) {
        animator.play(`walk-${facing}`);
      }
    } else {
      if (animator.currentClipName !== `idle-${facing}`) {
        animator.play(`idle-${facing}`);
      }
    }
  });
});
