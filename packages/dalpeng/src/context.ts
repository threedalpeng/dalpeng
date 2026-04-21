import type { Application, GameEntity, Scene } from "@dalpeng/core";
import { pushScope as corePushScope, findScope, hasScope, type Scope } from "@dalpeng/core";

interface DalpengScopeFrame {
  app?: Application | null;
  scene?: Scene | null;
  entity?: GameEntity | null;
  parent?: GameEntity | null;
}

export function pushScope(frame: DalpengScopeFrame): () => void {
  // Order matters: outermost kind pushed first so findScope("app") resolves correctly.
  const pops: (() => void)[] = [];
  if (frame.app !== undefined && frame.app !== null) {
    pops.push(corePushScope({ kind: "app", app: frame.app, cleanups: new Set() }));
  }
  if (frame.scene !== undefined && frame.scene !== null) {
    pops.push(corePushScope({ kind: "scene", scene: frame.scene, cleanups: new Set() }));
  }
  if (frame.entity !== undefined && frame.entity !== null) {
    pops.push(
      corePushScope({
        kind: "entity",
        entity: frame.entity,
        parent: frame.parent ?? null,
        cleanups: new Set(),
      })
    );
  }
  return () => {
    for (let i = pops.length - 1; i >= 0; i--) pops[i]();
  };
}

export function getThis(): Application | Scene | GameEntity | null {
  return getThisEntity() ?? getThisScene() ?? getThisApp();
}

export function getThisApp(): Application | null {
  return findScope("app")?.app ?? null;
}

export function requireApp(hookName: string): Application {
  const app = getThisApp();
  if (!app)
    throw new Error(
      `${hookName}() requires an active Application context (must be called inside defineApp setup).`
    );
  return app;
}

export function getThisScene(): Scene | null {
  return findScope("scene")?.scene ?? null;
}

export function requireScene(hookName: string): Scene {
  const scene = getThisScene();
  if (!scene)
    throw new Error(
      `${hookName}() requires an active Scene context (must be called inside defineScene setup).`
    );
  return scene;
}

export function getThisEntity(): GameEntity | null {
  return findScope("entity")?.entity ?? null;
}

export function requireEntity(hookName: string): GameEntity {
  const entity = getThisEntity();
  if (!entity) {
    if (hasScope("ui")) {
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

export function getParentEntity(): GameEntity | null {
  const entityScope = findScope("entity") as Extract<Scope, { kind: "entity" }> | null;
  return entityScope?.parent ?? null;
}

export {
  beginCleanupScope,
  endCleanupScope,
  hasActiveCleanupScope,
  registerCleanup,
} from "@dalpeng/core";
