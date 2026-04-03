import type { Tween, TweenOptions } from "@dalpeng/core";
import { requireEntity } from "../context";
import { onDestroy } from "./gameEntity";

/**
 * Returns a tween creator bound to the current entity.
 * All tweens created through this handle are automatically stopped
 * when the entity is destroyed.
 *
 * Must be called inside defineGameEntity() setup.
 */
export function useTween() {
  const entity = requireEntity("useTween");
  const tweens = entity.currentApp.tweens;
  const tracked: Tween[] = [];

  // Auto-cleanup when entity is destroyed
  onDestroy(() => {
    for (const t of tracked) {
      t.stop();
      tweens.remove(t);
    }
    tracked.length = 0;
  });

  return {
    /** Create a tween on the given target object */
    tween(target: Record<string, number>, opts: TweenOptions): Tween {
      const t = tweens.create(target, opts);
      tracked.push(t);
      return t;
    },
    /** Stop all tweens created by this handle */
    stopAll(): void {
      for (const t of tracked) {
        t.stop();
        tweens.remove(t);
      }
      tracked.length = 0;
    },
  };
}
