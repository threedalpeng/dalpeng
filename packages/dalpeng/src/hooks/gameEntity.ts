import {
  APP_NODE_KIND,
  GameEntity,
  MeshBuilder,
  MeshRenderer,
  Script,
  Transform,
  type AppNode,
  type Component,
  type EntityNode,
} from "@dalpeng/core";
import type { Quaternion, Vec3 } from "@dalpeng/math";
import { getThisUI as uiGetActiveScope, withLayer as uiWithLayer } from "@dalpeng/ui";
import { getThisEntity, hasActiveCleanupScope, registerCleanup, requireEntity } from "../context";

function uiHasActiveScope(): boolean {
  return uiGetActiveScope() !== null;
}

export type GameFactory = () => EntityNode;
export type GameFactoryWithProps<P> = (props: P) => EntityNode;

export function defineEntity(setup: () => AppNode[] | void): GameFactory;
export function defineEntity<P>(setup: (props: P) => AppNode[] | void): GameFactoryWithProps<P>;
export function defineEntity<P>(setup: (props: P) => AppNode[] | void): (props: P) => EntityNode {
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

export interface TransformInit {
  position?: Vec3;
  rotation?: Quaternion;
  scale?: Vec3;
}

/** Shortcut for `useComponent(Transform, (t) => {...})` with init pose. */
export function useTransform(init?: TransformInit): Transform {
  return useComponent(Transform, (t) => {
    if (init?.position) t.position = init.position;
    if (init?.rotation) t.rotation = init.rotation;
    if (init?.scale) t.scale = init.scale;
  });
}

export function onUpdate(update: () => void): () => void {
  requireEntity("onUpdate");
  const script = useComponent(Script);
  return script.on("update", update);
}
export function onFixedUpdate(fixedUpdate: () => void): () => void {
  requireEntity("onFixedUpdate");
  const script = useComponent(Script);
  return script.on("fixedUpdate", fixedUpdate);
}

export function onLateUpdate(lateUpdate: () => void): () => void {
  requireEntity("onLateUpdate");
  const script = useComponent(Script);
  return script.on("lateUpdate", lateUpdate);
}

export function withTag(tag: string) {
  const entity = requireEntity("withTag");
  entity.tag = tag;
}

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
    return () => {}; // cleanup scope owns the lifetime; fires on scope end
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
