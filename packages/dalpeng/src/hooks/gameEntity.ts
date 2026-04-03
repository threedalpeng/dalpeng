import { GameEntity, MeshBuilder, MeshRenderer, Script, Transform, type Component } from "@dalpeng/core";
import {
  getParentEntity,
  getThisEntity,
  getThisScene,
  requireEntity,
  setParentEntity,
  setThisEntity,
  setThisScene,
  beginCleanupScope,
  endCleanupScope,
  registerCleanup,
  hasActiveCleanupScope,
} from "../context";

export type UseGameEntity = () => GameEntity;

export function defineGameEntity(setup: () => UseGameEntity[] | void): UseGameEntity;
export function defineGameEntity<P>(setup: (props: P) => UseGameEntity[] | void): (props: P) => UseGameEntity;
export function defineGameEntity<P = void>(setup: (props?: P) => UseGameEntity[] | void) {
  const factory = (props?: P): UseGameEntity => () => {
    const entity = new GameEntity();
    setThisEntity(entity);

    const parent = getParentEntity();
    if (parent === null) {
      getThisScene()?.addEntity(entity);
    } else {
      parent.addChild(entity);
    }
    entity.addComponent(Transform);

    const cleanups = beginCleanupScope();
    const prevParent = parent;
    try {
      const children = setup(props as P) ?? [];
      setParentEntity(entity);
      children.forEach((child) => child());
    } finally {
      endCleanupScope();
      setParentEntity(prevParent);
    }

    // Auto-register cleanup handlers on entity destroy
    if (cleanups.size > 0) {
      const script = entity.getComponent(Script) ?? entity.addComponent(Script);
      script.on("destroy", () => {
        cleanups.forEach((fn) => fn());
        cleanups.clear();
      });
    }

    return entity;
  };

  // Props overload detection: setup.length === 0 means no-props variant
  return (setup.length === 0 ? factory() : factory) as any;
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

export function onUpdate(update: () => any) {
  requireEntity("onUpdate");
  const script = useComponent(Script);
  script.on("update", update);
}
export function onFixedUpdate(fixedUpdate: () => any) {
  requireEntity("onFixedUpdate");
  const script = useComponent(Script);
  script.on("fixedUpdate", fixedUpdate);
}

export function onLateUpdate(lateUpdate: () => any) {
  requireEntity("onLateUpdate");
  const script = useComponent(Script);
  script.on("lateUpdate", lateUpdate);
}

export function withTag(tag: string) {
  const entity = requireEntity("withTag");
  entity.tag = tag;
}

export function spawn(factory: UseGameEntity, parent?: GameEntity): void {
  const callingEntity = requireEntity("spawn");
  const app = callingEntity.currentApp;
  const scene = parent?.scene ?? callingEntity.scene;

  app.spawn(() => {
    setThisScene(scene);
    setParentEntity(parent ?? null);
    return factory();
  });
}

export function destroy(entity?: GameEntity): void {
  const self = requireEntity("destroy");
  self.currentApp.destroy(entity ?? self);
}

export function onStart(callback: () => void) {
  requireEntity("onStart");
  const script = useComponent(Script);
  script.on("start", callback);
}

export function onDestroy(callback: () => void) {
  if (getThisEntity()) {
    const script = useComponent(Script);
    script.on("destroy", callback);
  } else if (hasActiveCleanupScope()) {
    registerCleanup(callback);
  } else {
    throw new Error("onDestroy() requires defineGameEntity or defineUI context.");
  }
}

export function onEnable(callback: () => void) {
  requireEntity("onEnable");
  const script = useComponent(Script);
  script.on("enable", callback);
}

export function onDisable(callback: () => void) {
  requireEntity("onDisable");
  const script = useComponent(Script);
  script.on("disable", callback);
}
