import { GameEntity, Script, Transform, type Component } from "@dalpeng/core";
import { getThisEntity, getThisScene, setThisEntity } from "./context";

let parentEntity: GameEntity | null = null;
export type UseGameEntity = ReturnType<typeof defineGameEntity>;
export function defineGameEntity(setup: () => UseGameEntity[] | void) {
  return () => {
    const entity = new GameEntity();
    setThisEntity(entity);

    if (parentEntity === null) {
      getThisScene()?.addEntity(entity);
    } else {
      parentEntity.addChild(entity);
    }
    entity.addComponent(Transform);

    const children = setup() ?? [];
    const gp = parentEntity;
    parentEntity = entity;
    children.forEach((child) => {
      child();
    });
    parentEntity = gp;
    return entity;
  };
}

type ComponentConstructor<Type extends Component> = new (
  gameEntity: GameEntity
) => Type;
export function useComponent<C extends Component>(
  type: ComponentConstructor<C>
) {
  const thisEntity = getThisEntity();
  let c: C | null = thisEntity!.getComponent(type);
  if (!c) {
    c = thisEntity!.addComponent(type);
  }
  return c;
}

export function onUpdate(update: () => any) {
  const script = useComponent(Script);
  script.on("update", update);
}
export function onFixedUpdate(fixedUpdate: () => any) {
  const script = useComponent(Script);
  script.on("fixedUpdate", fixedUpdate);
}
