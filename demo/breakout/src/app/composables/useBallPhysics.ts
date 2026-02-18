import { vec3 } from "@dalpeng/math";
import { Input, Time, Transform, useComponent, onUpdate } from "dalpeng";
import { addScore, isGameOver, isCleared, loseLife } from "./useGameState";

const SPEED = 6;
const BOUNDS_X = 8;
const BOUNDS_Y_TOP = 6;
const BOUNDS_Y_BOTTOM = -7;
const BALL_RADIUS = 0.15;

export default function useBallPhysics() {
  const transform = useComponent(Transform);

  let velocity = vec3(0, 0, 0);
  let launched = false;
  let paddleTransform: Transform | null = null;

  onUpdate(() => {
    const dt = Time.delta() * 0.001;
    const scene = transform.gameEntity.scene;

    // Cache paddle reference
    if (!paddleTransform) {
      const paddles = scene.findByTag("paddle");
      if (paddles.length > 0) {
        paddleTransform = paddles[0].getComponent(Transform);
      }
    }

    // Stop if game over or cleared
    if (isGameOver() || isCleared()) return;

    // Before launch: follow paddle
    if (!launched) {
      if (paddleTransform) {
        const pp = paddleTransform.position;
        transform.position = vec3(pp.x, pp.y + 0.35, 0);
      }
      if (Input.keyDown("Space")) {
        launched = true;
        // Launch at slight angle
        const angle = (Math.random() * 0.6 + 0.7) * (Math.random() > 0.5 ? 1 : -1);
        velocity = vec3(Math.sin(angle) * SPEED, Math.cos(angle) * SPEED, 0);
      }
      return;
    }

    // Move
    const p = transform.position;
    let nx = p.x + velocity.x * dt;
    let ny = p.y + velocity.y * dt;
    let vx = velocity.x;
    let vy = velocity.y;

    // Wall collision (left/right)
    if (nx - BALL_RADIUS < -BOUNDS_X) {
      nx = -BOUNDS_X + BALL_RADIUS;
      vx = Math.abs(vx);
    } else if (nx + BALL_RADIUS > BOUNDS_X) {
      nx = BOUNDS_X - BALL_RADIUS;
      vx = -Math.abs(vx);
    }

    // Wall collision (top)
    if (ny + BALL_RADIUS > BOUNDS_Y_TOP) {
      ny = BOUNDS_Y_TOP - BALL_RADIUS;
      vy = -Math.abs(vy);
    }

    // Paddle collision
    if (paddleTransform && vy < 0) {
      const pp = paddleTransform.position;
      const ps = paddleTransform.scale;
      const padLeft = pp.x - ps.x;
      const padRight = pp.x + ps.x;
      const padTop = pp.y + ps.y;
      const padBottom = pp.y - ps.y;

      if (
        nx + BALL_RADIUS > padLeft &&
        nx - BALL_RADIUS < padRight &&
        ny - BALL_RADIUS < padTop &&
        ny - BALL_RADIUS > padBottom
      ) {
        ny = padTop + BALL_RADIUS;
        // Reflect angle based on hit position (-1 to 1)
        const hitPos = (nx - pp.x) / ps.x;
        const angle = hitPos * 1.2; // max ~70 degrees
        const speed = Math.sqrt(vx * vx + vy * vy);
        vx = Math.sin(angle) * speed;
        vy = Math.abs(Math.cos(angle) * speed);
      }
    }

    // Brick collision
    const bricks = scene.findByTag("brick");
    for (const brick of bricks) {
      const bt = brick.getComponent(Transform);
      if (!bt) continue;
      const bp = bt.position;
      const bs = bt.scale;
      const bLeft = bp.x - bs.x;
      const bRight = bp.x + bs.x;
      const bTop = bp.y + bs.y;
      const bBottom = bp.y - bs.y;

      if (
        nx + BALL_RADIUS > bLeft &&
        nx - BALL_RADIUS < bRight &&
        ny + BALL_RADIUS > bBottom &&
        ny - BALL_RADIUS < bTop
      ) {
        // Determine collision side
        const overlapLeft = nx + BALL_RADIUS - bLeft;
        const overlapRight = bRight - (nx - BALL_RADIUS);
        const overlapTop = bTop - (ny - BALL_RADIUS);
        const overlapBottom = ny + BALL_RADIUS - bBottom;
        const minOverlapX = Math.min(overlapLeft, overlapRight);
        const minOverlapY = Math.min(overlapTop, overlapBottom);

        if (minOverlapX < minOverlapY) {
          vx = -vx;
        } else {
          vy = -vy;
        }

        // Destroy brick and score
        brick.currentApp.destroy(brick);
        addScore(10);
        break; // One brick per frame
      }
    }

    // Ball lost (below screen)
    if (ny < BOUNDS_Y_BOTTOM) {
      launched = false;
      velocity = vec3(0, 0, 0);
      // Reset to paddle
      if (paddleTransform) {
        const pp = paddleTransform.position;
        transform.position = vec3(pp.x, pp.y + 0.35, 0);
      }
      loseLife();
      return;
    }

    velocity = vec3(vx, vy, 0);
    transform.position = vec3(nx, ny, 0);
  });
}
