import { cleared, gameOver, resetGame, setCleared } from "@app/composables/useGameState";
import {
  defineEntity,
  onUpdate,
  spawn,
  Transform,
  useActionDown,
  useComponent,
  withName,
} from "dalpeng";
import Ball from "./Ball";
import BrickGrid from "./BrickGrid";
import Paddle from "./Paddle";

export default defineEntity(() => {
  withName("GameManager");

  const transform = useComponent(Transform);

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

  onUpdate(() => {
    if (gameOver.value || cleared.value) return;

    const scene = transform.gameEntity.scene;
    const bricks = scene.findByTag("brick");
    if (bricks.length === 0) {
      setCleared();
    }
  });
});
