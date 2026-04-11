import type { Tween, TweenOptions } from "@dalpeng/core";
import { requireEntity } from "../context";
import { onDestroy } from "./gameEntity";

/** Must be called inside defineGameEntity() setup. */
export function useTween() {
  const entity = requireEntity("useTween");
  const tweens = entity.currentApp.tweens;
  const tracked: Tween[] = [];

  onDestroy(() => {
    for (const t of tracked) {
      t.stop();
      tweens.remove(t);
    }
    tracked.length = 0;
  });

  return {
    tween(target: Record<string, number>, opts: TweenOptions): Tween {
      const t = tweens.create(target, opts);
      tracked.push(t);
      return t;
    },
    stopAll(): void {
      for (const t of tracked) {
        t.stop();
        tweens.remove(t);
      }
      tracked.length = 0;
    },
  };
}
