import { Sprite2DRenderer, SpriteAnimator, SpriteAtlas } from "@dalpeng/core";
import { vec3 } from "@dalpeng/math";
import type { SpriteAnimationClip } from "dalpeng";
import {
  defineEntity,
  onStart,
  onUpdate,
  Time,
  Transform,
  useComponent,
  useInput,
  useSceneSwitch,
  withName,
  withTag,
} from "dalpeng";
import TownScene from "../Scene";

const MOVE_SPEED = 4;
const SPRITE_URL = "/assets/sprites/player.png";

const WALK_CLIPS: SpriteAnimationClip[] = [
  { name: "idle-down", frames: [0], frameDuration: 1, loop: true },
  { name: "walk-down", frames: [0, 1, 2, 3], frameDuration: 0.15, loop: true },
  { name: "idle-up", frames: [4], frameDuration: 1, loop: true },
  { name: "walk-up", frames: [4, 5, 6, 7], frameDuration: 0.15, loop: true },
  { name: "idle-left", frames: [8], frameDuration: 1, loop: true },
  { name: "walk-left", frames: [8, 9, 10, 11], frameDuration: 0.15, loop: true },
  { name: "idle-right", frames: [12], frameDuration: 1, loop: true },
  { name: "walk-right", frames: [12, 13, 14, 15], frameDuration: 0.15, loop: true },
];

export default defineEntity(() => {
  withName("Player");
  withTag("player");

  const transform = useComponent(Transform, (t) => {
    t.position = vec3(10, 7.5, 0);
    t.scale = vec3(1, 1, 1);
  });

  const sprite = useComponent(Sprite2DRenderer, (s) => {
    s.pixelsPerUnit = 16;
    s.sortingLayer = 1;
  });

  const animator = useComponent(SpriteAnimator);

  for (const clip of WALK_CLIPS) {
    animator.addClip(clip);
  }

  const sceneSwitch = useSceneSwitch();

  let facing = "down";

  onStart(async () => {
    try {
      const app = sprite.gameEntity.currentApp;
      const tex = await app.textures.load(SPRITE_URL, { srgb: true, mipmaps: false });
      sprite.atlas = SpriteAtlas.fromUniform(tex, 64, 64, 16, 16);
      animator.play("idle-down");
    } catch {
      console.warn("[FieldPlayer] Could not load sprite:", SPRITE_URL);
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
    }

    if (dx !== 0 || dy !== 0) {
      const len = Math.sqrt(dx * dx + dy * dy);
      dx = (dx / len) * MOVE_SPEED * dt;
      dy = (dy / len) * MOVE_SPEED * dt;

      const pos = transform.position;
      transform.position = vec3(pos[0] + dx, pos[1] + dy, pos[2]);

      if (animator.currentClipName !== `walk-${facing}`) {
        animator.play(`walk-${facing}`);
      }
    } else {
      if (animator.currentClipName !== `idle-${facing}`) {
        animator.play(`idle-${facing}`);
      }
    }

    const pos = transform.position;
    if (pos[0] < 1.5 && (input.keyDown("KeyE") || input.keyDown("Enter"))) {
      sceneSwitch.switchTo(TownScene, { type: "fade", duration: 400 });
    }
  });
});
