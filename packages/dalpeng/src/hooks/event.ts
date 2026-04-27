import type { Dispatcher, EventMap, GameEntity, GameEntityEventMap } from "@dalpeng/core";
import { requireEntity } from "../context";
import { onDestroy } from "./gameEntity";

export function useSceneEvent<E extends EventMap, K extends keyof E>(
  event: K,
  cb: (...args: E[K]) => void
): void {
  const entity = requireEntity("useSceneEvent");
  const scene = entity.scene;
  if (!scene) {
    throw new Error("useSceneEvent() requires the entity to be attached to a scene.");
  }
  const unsub = (scene.events as Dispatcher<E>).on(event, cb);
  onDestroy(unsub);
}

export function emitSceneEvent<E extends EventMap, K extends keyof E>(
  event: K,
  ...args: E[K]
): void {
  const entity = requireEntity("emitSceneEvent");
  const scene = entity.scene;
  if (!scene) {
    throw new Error("emitSceneEvent() requires the entity to be attached to a scene.");
  }
  (scene.events as Dispatcher<E>).emit(event, ...args);
}

/**
 * Subscribe to events from `target` and auto-unsub on the CALLING entity's
 * destroy (target's destroy is handled by target's own dispatcher cleanup).
 */
export function useEntityEvent<K extends keyof GameEntityEventMap>(
  target: GameEntity,
  event: K,
  cb: (...args: GameEntityEventMap[K]) => void
): void {
  requireEntity("useEntityEvent");
  const unsub = target.on(event, cb);
  onDestroy(unsub);
}

/** Emit on the current entity. Cross-entity: call `other.emit(...)` directly. */
export function emitEntityEvent<K extends keyof GameEntityEventMap>(
  event: K,
  ...args: GameEntityEventMap[K]
): void {
  const entity = requireEntity("emitEntityEvent");
  entity.emit(event, ...args);
}
