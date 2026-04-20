import type { Application, GameEntity, Scene } from "@dalpeng/core";
import { isInUIScope } from "@dalpeng/core";

/**
 * Authoring scope state.
 *
 * Historically there were 5+ parallel module-level variables
 * (thisApp/thisScene/thisEntity/parentEntity/currentThis) updated by pair
 * of setter calls. That structure made nested setup physically impossible
 * (no stack) and cross-package scope detection required ad-hoc signals
 * like `isInUIScope()`.
 *
 * This module now keeps a single **scope stack**. Each `pushScope()`
 * adds a frame inheriting unspecified fields from the outer frame; the
 * returned function pops it. Nested `defineEntity` / `defineScene` are
 * expressible for free — each setup just pushes its own frame.
 *
 * `setThisX` setters are preserved as a thin legacy surface for callers
 * that haven't migrated yet. They all funnel through the same stack.
 */

interface Frame {
  app: Application | null;
  scene: Scene | null;
  entity: GameEntity | null;
  parent: GameEntity | null;
}

const EMPTY_FRAME: Frame = {
  app: null,
  scene: null,
  entity: null,
  parent: null,
};

const stack: Frame[] = [];

function current(): Frame {
  return stack[stack.length - 1] ?? EMPTY_FRAME;
}

/**
 * Push a new authoring scope. Unspecified fields inherit from the outer
 * frame — so an entity frame pushed inside a scene frame still reports
 * the outer scene via `getThisScene()`. Returns a function that pops.
 */
export function pushScope(patch: Partial<Frame>): () => void {
  const outer = current();
  stack.push({
    app: patch.app !== undefined ? patch.app : outer.app,
    scene: patch.scene !== undefined ? patch.scene : outer.scene,
    // entity and parent do NOT inherit — nested setup gets a fresh entity
    // identity. `setParentEntity(null)` after pushScope({entity}) lets the
    // caller mark "no parent" explicitly.
    entity: patch.entity !== undefined ? patch.entity : null,
    parent: patch.parent !== undefined ? patch.parent : null,
  });
  return () => {
    stack.pop();
  };
}

export function getThis(): Application | Scene | GameEntity | null {
  const f = current();
  return f.entity ?? f.scene ?? f.app;
}

export function getThisApp() {
  return current().app;
}

export function setThisApp(app: Application | null) {
  // Legacy: mutate the top frame rather than push.
  if (stack.length === 0) stack.push({ ...EMPTY_FRAME });
  stack[stack.length - 1].app = app;
}

export function requireApp(hookName: string): Application {
  const app = current().app;
  if (!app)
    throw new Error(
      `${hookName}() requires an active Application context (must be called inside defineApp setup).`
    );
  return app;
}

export function getThisScene() {
  return current().scene;
}

export function setThisScene(scene: Scene | null) {
  if (stack.length === 0) stack.push({ ...EMPTY_FRAME });
  stack[stack.length - 1].scene = scene;
}

export function requireScene(hookName: string): Scene {
  const scene = current().scene;
  if (!scene)
    throw new Error(
      `${hookName}() requires an active Scene context (must be called inside defineScene setup).`
    );
  return scene;
}

export function getThisEntity() {
  return current().entity;
}

export function setThisEntity(entity: GameEntity | null) {
  if (stack.length === 0) stack.push({ ...EMPTY_FRAME });
  stack[stack.length - 1].entity = entity;
}

export function requireEntity(hookName: string): GameEntity {
  const entity = current().entity;
  if (!entity) {
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
    throw new Error(`${hookName}() must be called inside defineEntity setup.`);
  }
  return entity;
}

export function getParentEntity() {
  return current().parent;
}

export function setParentEntity(entity: GameEntity | null) {
  if (stack.length === 0) stack.push({ ...EMPTY_FRAME });
  stack[stack.length - 1].parent = entity;
}

// Cleanup scope helpers live in @dalpeng/core so reactive primitives and
// @dalpeng/ui share the same singleton stack without a circular dep.
export {
  beginCleanupScope,
  endCleanupScope,
  hasActiveCleanupScope,
  registerCleanup,
} from "@dalpeng/core";
