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
 * Subscribe to an event on `target` entity from inside a `defineEntity` setup.
 * Auto-unsubscribes when the calling entity is destroyed (not when `target` is
 * destroyed — that is handled by `target` clearing its own dispatcher on
 * remove). Use this when one entity wants to react to events from another.
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

/**
 * Emit an event on the current entity (the one whose `defineEntity` setup is
 * active). Cross-entity emits are direct — call `other.emit(event, ...args)`.
 */
export function emitEntityEvent<K extends keyof GameEntityEventMap>(
  event: K,
  ...args: GameEntityEventMap[K]
): void {
  const entity = requireEntity("emitEntityEvent");
  entity.emit(event, ...args);
}
