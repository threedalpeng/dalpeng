import {
  APP_NODE_KIND,
  GameEntity,
  MeshBuilder,
  MeshRenderer,
  Script,
  type AppNode,
  type Component,
  type EntityNode,
} from "@dalpeng/core";
import { getThisEntity, hasActiveCleanupScope, registerCleanup, requireEntity } from "../context";
// withLayer works in both entity AND UI scope; dispatch to the UI hook when
// inside a defineUI setup. getThisUI returning null is the cheap test.
import { getThisUI as uiGetActiveScope, withLayer as uiWithLayer } from "@dalpeng/ui";

function uiHasActiveScope(): boolean {
  return uiGetActiveScope() !== null;
}

export type GameFactory = () => EntityNode;
export type GameFactoryWithProps<P> = (props: P) => EntityNode;

export function defineEntity(setup: () => AppNode[] | void): GameFactory;
export function defineEntity<P>(setup: (props: P) => AppNode[] | void): GameFactoryWithProps<P>;
export function defineEntity<P>(setup: (props: P) => AppNode[] | void): (props: P) => EntityNode {
  // Passing undefined for P=void is sound at runtime; the public overloads
  // declare the correct external types.
  return (props: P) => ({ [APP_NODE_KIND]: "game", setup, props }) as unknown as EntityNode;
}

type ComponentConstructor<Type extends Component> = new (gameEntity: GameEntity) => Type;
export function useComponent<C extends Component>(
  type: ComponentConstructor<C>,
  init?: (component: C) => void
): C {
  const entity = requireEntity("useComponent");
  const comp = entity.getComponent(type) ?? entity.addComponent(type);
  init?.(comp);
  return comp;
}

export function useMesh(
  type: "box" | "sphere" | "cylinder" | "quad",
  init?: (renderer: MeshRenderer) => void
): MeshRenderer {
  const renderer = useComponent(MeshRenderer);
  renderer.mesh = MeshBuilder[type]();
  init?.(renderer);
  return renderer;
}

export function onUpdate(update: () => any): () => void {
  requireEntity("onUpdate");
  const script = useComponent(Script);
  return script.on("update", update);
}
export function onFixedUpdate(fixedUpdate: () => any): () => void {
  requireEntity("onFixedUpdate");
  const script = useComponent(Script);
  return script.on("fixedUpdate", fixedUpdate);
}

export function onLateUpdate(lateUpdate: () => any): () => void {
  requireEntity("onLateUpdate");
  const script = useComponent(Script);
  return script.on("lateUpdate", lateUpdate);
}

export function withTag(tag: string) {
  const entity = requireEntity("withTag");
  entity.tag = tag;
}

/**
 * Assign the current setup scope to a named layer.
 *
 * Works in both game entity and UI scopes:
 *   - Inside `defineEntity`: stamps the entity with the layer name.
 *   - Inside `defineUI`: forwards to `@dalpeng/ui`'s `withLayer`.
 *
 * Game entity validation happens immediately (entity has app context).
 * UI validation is deferred to mount time (UI is authored before being attached to an app).
 */
export function withLayer(name: string) {
  if (uiHasActiveScope()) {
    uiWithLayer(name);
    return;
  }
  const entity = requireEntity("withLayer");
  const app = entity.scene?.app;
  if (!app) {
    throw new Error(
      `withLayer("${name}"): entity has no Application context yet. ` +
        `Call withLayer inside defineEntity setup, after the entity is attached to a scene.`
    );
  }
  if (!app.layers.has(name)) {
    const known = app.layers.ordered.map((l) => l.name).join(", ");
    throw new Error(
      `withLayer("${name}"): no such layer. ` +
        `Did you forget to declare it in withLayers([...])? ` +
        `Known layers: ${known}.`
    );
  }
  entity._layerName = name;
}

export function spawn(factory: GameFactory, parent?: GameEntity): void;
export function spawn(node: EntityNode, parent?: GameEntity): void;
export function spawn(arg: GameFactory | EntityNode, parent?: GameEntity): void {
  const callingEntity = requireEntity("spawn");
  const app = callingEntity.currentApp;
  // Factory vs descriptor: factory is `() => EntityNode`, descriptor is the
  // plain object returned by calling that factory. Either is valid from the
  // user's perspective — core `Application.spawn` already accepts both, so
  // collapse the distinction here.
  const descriptor = typeof arg === "function" ? arg() : arg;
  app.spawn(descriptor, parent ?? undefined);
}

export function destroy(entity?: GameEntity): void {
  const self = requireEntity("destroy");
  self.currentApp.destroy(entity ?? self);
}

export function onStart(callback: () => void): () => void {
  requireEntity("onStart");
  const script = useComponent(Script);
  return script.on("start", callback);
}

export function onDestroy(callback: () => void): () => void {
  if (getThisEntity()) {
    const script = useComponent(Script);
    return script.on("destroy", callback);
  } else if (hasActiveCleanupScope()) {
    registerCleanup(callback);
    // cleanup scope owns the lifetime — return a noop; cleanup fires on scope end.
    return () => {};
  } else {
    throw new Error("onDestroy() requires defineEntity or defineUI context.");
  }
}

export function onEnable(callback: () => void): () => void {
  requireEntity("onEnable");
  const script = useComponent(Script);
  return script.on("enable", callback);
}

export function onDisable(callback: () => void): () => void {
  requireEntity("onDisable");
  const script = useComponent(Script);
  return script.on("disable", callback);
}
