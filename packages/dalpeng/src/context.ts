import type { Application, GameEntity, Scene } from "@dalpeng/core";
import { isInUIScope } from "@dalpeng/core";

let currentThis: Application | Scene | GameEntity | null = null;
export function getThis() {
  return currentThis;
}

let thisApp: Application | null = null;
export function getThisApp() {
  return thisApp;
}
export function setThisApp(app: Application | null) {
  thisApp = app;
  currentThis = app;
}
export function requireApp(hookName: string): Application {
  if (!thisApp)
    throw new Error(
      `${hookName}() requires an active Application context (must be called inside defineApp setup).`
    );
  return thisApp;
}

let thisScene: Scene | null = null;
export function getThisScene() {
  return thisScene;
}
export function setThisScene(scene: Scene | null) {
  thisScene = scene;
  currentThis = scene;
}
export function requireScene(hookName: string): Scene {
  if (!thisScene)
    throw new Error(
      `${hookName}() requires an active Scene context (must be called inside defineScene setup).`
    );
  return thisScene;
}

let thisEntity: GameEntity | null = null;
export function getThisEntity() {
  return thisEntity;
}
export function setThisEntity(entity: GameEntity | null) {
  thisEntity = entity;
  currentThis = entity;
}
export function requireEntity(hookName: string): GameEntity {
  if (!thisEntity) {
    // Can't import getThisUI directly (circular dep via @dalpeng/ui).
    // isInUIScope() is the cross-package boolean signal @dalpeng/ui toggles.
    if (isInUIScope()) {
      throw new Error(
        `${hookName}() is a game-kind hook and cannot be called inside defineUI setup. ` +
          `Frame hooks (onUpdate / onFixedUpdate / onLateUpdate / onStart / onEnable / onDisable) ` +
          `are only available on game-kind nodes. ` +
          `If you need to react to state changes inside a UI, use watch(ref, ...) instead.`
      );
    }
    throw new Error(`${hookName}() must be called inside defineGameEntity setup.`);
  }
  return thisEntity;
}

let parentEntity: GameEntity | null = null;
export function getParentEntity() {
  return parentEntity;
}
export function setParentEntity(entity: GameEntity | null) {
  parentEntity = entity;
}

// Cleanup scope helpers live in @dalpeng/core so reactive primitives and
// @dalpeng/ui share the same singleton stack without a circular dep.
export {
  beginCleanupScope,
  endCleanupScope,
  hasActiveCleanupScope,
  registerCleanup,
} from "@dalpeng/core";
