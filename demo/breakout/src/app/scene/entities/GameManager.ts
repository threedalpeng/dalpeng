import { defineGameEntity, onUpdate, Transform, useComponent, withName } from "dalpeng";
import { isCleared, isGameOver, setCleared } from "@app/composables/useGameState";

export default defineGameEntity(() => {
  withName("GameManager");

  const transform = useComponent(Transform);

  onUpdate(() => {
    if (isGameOver() || isCleared()) return;

    const scene = transform.gameEntity.scene;
    const bricks = scene.findByTag("brick");
    if (bricks.length === 0) {
      setCleared();
    }
  });
});
