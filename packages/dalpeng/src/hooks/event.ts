import type { Dispatcher, EventMap } from "@dalpeng/core";
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
