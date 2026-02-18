import { GameEntity, MeshBuilder, MeshRenderer, Script, Transform, type Component } from "@dalpeng/core";
import {
  getParentEntity,
  getThisScene,
  requireEntity,
  setParentEntity,
  setThisEntity,
  setThisScene,
} from "./context";

export type UseGameEntity = ReturnType<typeof defineGameEntity>;
export function defineGameEntity(setup: () => UseGameEntity[] | void) {
  return () => {
    const entity = new GameEntity();
    setThisEntity(entity);

    const parent = getParentEntity();
    if (parent === null) {
      getThisScene()?.addEntity(entity);
    } else {
      parent.addChild(entity);
    }
    entity.addComponent(Transform);

    const prevParent = parent;
    try {
      const children = setup() ?? [];
      setParentEntity(entity);
      children.forEach((child) => child());
    } finally {
      setParentEntity(prevParent);
    }
    return entity;
  };
}

type ComponentConstructor<Type extends Component> = new (gameEntity: GameEntity) => Type;
export function useComponent<C extends Component>(type: ComponentConstructor<C>): C {
  const entity = requireEntity("useComponent");
  return entity.getComponent(type) ?? entity.addComponent(type);
}

export function useMesh(type: "box" | "sphere" | "cylinder" | "quad"): MeshRenderer {
  const renderer = useComponent(MeshRenderer);
  renderer.mesh = MeshBuilder[type]();
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
  requireEntity("onDestroy");
  const script = useComponent(Script);
  script.on("destroy", callback);
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
