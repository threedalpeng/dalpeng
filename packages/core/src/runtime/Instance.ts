import type GameEntity from "../ecs/GameEntity";
import type Scene from "../Scene";
import type { GameDescriptor, UIDescriptor } from "./Descriptor";

export const INSTANCE_KIND: unique symbol = Symbol("dalpeng.instanceKind");

export type InstanceKind = "game" | "ui";

export interface Instance<K extends InstanceKind = InstanceKind> {
  readonly [INSTANCE_KIND]: K;
}

export interface GameInstance extends Instance<"game"> {
  readonly descriptor: GameDescriptor;
  readonly entity: GameEntity;
  readonly owner: GameInstance | Scene;
  readonly gameChildren: GameInstance[];
  readonly uiChildren: UIInstance[];
}

export interface UIInstance extends Instance<"ui"> {
  readonly descriptor: UIDescriptor;
  readonly owner: GameInstance | Scene;
  /** Opaque renderer payload — `core` never reads this. */
  readonly rendererState: unknown;
  /** Idempotent teardown. Safe to call multiple times. */
  detach(): void;
}

export function isInstance(value: unknown): value is GameInstance | UIInstance {
  return value !== null && typeof value === "object" && INSTANCE_KIND in (value as object);
}

export type EntityInstance = GameInstance;

export function isGameInstance(value: unknown): value is GameInstance {
  return isInstance(value) && value[INSTANCE_KIND] === "game";
}

export const isEntityInstance = isGameInstance;

export function isUIInstance(value: unknown): value is UIInstance {
  return isInstance(value) && value[INSTANCE_KIND] === "ui";
}
