import { defineGameEntity, onUpdate, spawn, Transform, useComponent, withName, useActionDown } from "dalpeng";
import { cleared, gameOver, resetGame, setCleared } from "@app/composables/useGameState";
import Ball from "./Ball";
import BrickGrid from "./BrickGrid";
import Paddle from "./Paddle";

export default defineGameEntity(() => {
  withName("GameManager");

  const transform = useComponent(Transform);

  // ─── One-shot: Restart ───────────────────────────────────────────────
  useActionDown("restart", () => {
    if (!gameOver.value && !cleared.value) return;
    const scene = transform.gameEntity.scene;
    const app = transform.gameEntity.currentApp;

    for (const e of scene.findByTag("brick")) app.destroy(e);
    for (const e of scene.findByTag("ball")) app.destroy(e);
    for (const e of scene.findByTag("paddle")) app.destroy(e);
    for (const e of scene.findByTag("powerup")) app.destroy(e);

    resetGame();

    spawn(Paddle);
    spawn(BrickGrid);
    spawn(Ball);
  });

  // ─── Continuous: Clear check ─────────────────────────────────────────
  onUpdate(() => {
    if (gameOver.value || cleared.value) return;

    const scene = transform.gameEntity.scene;
    const bricks = scene.findByTag("brick");
    if (bricks.length === 0) {
      setCleared();
    }
  });
});
