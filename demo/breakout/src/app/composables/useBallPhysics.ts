import { vec3 } from "@dalpeng/math";
import { Time, Transform, useComponent, onUpdate, useActionDown } from "dalpeng";
import { addScore, gameOver, cleared, loseLife, speedMultiplier, setSpeedMultiplier } from "./useGameState";
import { takeDamage } from "@app/scene/entities/Brick";

const BASE_SPEED = 6;
const BOUNDS_X = 8;
const BOUNDS_Y_TOP = 6;
const BOUNDS_Y_BOTTOM = -7;
const BALL_RADIUS = 0.15;

export default function useBallPhysics() {
  const transform = useComponent(Transform);

  let velocity = vec3(0, 0, 0);
  let launched = false;
  let paddleTransform: Transform | null = null;
  let elapsedSinceLaunch = 0;
  const ACCEL_INTERVAL = 15; // seconds
  const ACCEL_STEP = 0.1;

  // ─── One-shot: Launch ────────────────────────────────────────────────
  useActionDown("launch", () => {
    if (launched || gameOver.value || cleared.value) return;
    launched = true;
    const angle = (Math.random() * 0.6 + 0.7) * (Math.random() > 0.5 ? 1 : -1);
    const speed = BASE_SPEED * speedMultiplier.value;
    velocity = vec3(Math.sin(angle) * speed, Math.cos(angle) * speed, 0);
  });

  onUpdate(() => {
    const dt = Time.delta() * 0.001;
    const scene = transform.gameEntity.scene;
    const speedMul = speedMultiplier.value;

    // Cache paddle reference
    if (!paddleTransform) {
      const paddles = scene.findByTag("paddle");
      if (paddles.length > 0) {
        paddleTransform = paddles[0].getComponent(Transform);
      }
    }

    // Stop if game over or cleared
    if (gameOver.value || cleared.value) return;

    // Before launch: follow paddle
    if (!launched) {
      if (paddleTransform) {
        const pp = paddleTransform.position;
        transform.position = vec3(pp.x, pp.y + 0.35, 0);
      }
      return;
    }

    // Auto-accelerate every 15 seconds
    elapsedSinceLaunch += dt;
    if (elapsedSinceLaunch >= ACCEL_INTERVAL) {
      elapsedSinceLaunch -= ACCEL_INTERVAL;
      setSpeedMultiplier(speedMultiplier.value + ACCEL_STEP);
    }

    // Apply speed multiplier — preserve direction, adjust magnitude
    const curSpeed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
    const targetSpeed = BASE_SPEED * speedMul;
    if (curSpeed > 0 && Math.abs(curSpeed - targetSpeed) > 0.01) {
      const ratio = targetSpeed / curSpeed;
      velocity = vec3(velocity.x * ratio, velocity.y * ratio, 0);
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

    // Paddle collision — swept check to prevent tunneling
    if (paddleTransform && vy < 0) {
      const pp = paddleTransform.position;
      const ps = paddleTransform.scale;
      const padLeft = pp.x - ps.x;
      const padRight = pp.x + ps.x;
      const padTop = pp.y + ps.y;

      // Check if ball crossed paddle top this frame (swept Y)
      const prevBottom = p.y - BALL_RADIUS;
      const nextBottom = ny - BALL_RADIUS;
      if (prevBottom >= padTop && nextBottom < padTop) {
        // Ball crossed paddle top — interpolate X at crossing time
        const t = (prevBottom - padTop) / (prevBottom - nextBottom);
        const crossX = p.x + (nx - p.x) * t;
        if (crossX + BALL_RADIUS > padLeft && crossX - BALL_RADIUS < padRight) {
          ny = padTop + BALL_RADIUS;
          nx = crossX;
          const hitPos = (nx - pp.x) / ps.x;
          const angle = hitPos * 1.2;
          const speed = Math.sqrt(vx * vx + vy * vy);
          vx = Math.sin(angle) * speed;
          vy = Math.abs(Math.cos(angle) * speed);
        }
      } else if (
        // Standard AABB overlap check (for slow-moving ball)
        nx + BALL_RADIUS > padLeft &&
        nx - BALL_RADIUS < padRight &&
        ny - BALL_RADIUS < padTop &&
        ny - BALL_RADIUS > pp.y - ps.y
      ) {
        ny = padTop + BALL_RADIUS;
        const hitPos = (nx - pp.x) / ps.x;
        const angle = hitPos * 1.2;
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
        // Determine collision side and push ball out
        const overlapLeft = nx + BALL_RADIUS - bLeft;
        const overlapRight = bRight - (nx - BALL_RADIUS);
        const overlapTop = bTop - (ny - BALL_RADIUS);
        const overlapBottom = ny + BALL_RADIUS - bBottom;
        const minOverlapX = Math.min(overlapLeft, overlapRight);
        const minOverlapY = Math.min(overlapTop, overlapBottom);

        if (minOverlapX < minOverlapY) {
          // Horizontal collision — push ball out sideways
          if (overlapLeft < overlapRight) {
            nx -= overlapLeft;
            vx = -Math.abs(vx);
          } else {
            nx += overlapRight;
            vx = Math.abs(vx);
          }
        } else {
          // Vertical collision — push ball out vertically
          if (overlapBottom < overlapTop) {
            // Ball closer to brick bottom → push down
            ny -= overlapBottom;
            vy = -Math.abs(vy);
          } else {
            // Ball closer to brick top → push up
            ny += overlapTop;
            vy = Math.abs(vy);
          }
        }

        takeDamage(brick);
        addScore(10);
        break;
      }
    }

    // Ball lost (below screen)
    if (ny < BOUNDS_Y_BOTTOM) {
      launched = false;
      velocity = vec3(0, 0, 0);
      elapsedSinceLaunch = 0;
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
