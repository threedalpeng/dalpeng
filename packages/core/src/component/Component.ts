import { isNil } from "../utils/basic.js";
import Entity from "../entity/Entity.js";
import type GameEntity from "../entity/GameEntity.js";

export type ComponentConstructor<Type extends Component> = new (
  gameEntity: GameEntity
) => Type;
type ComponentGroup<Type extends Component> = Map<number, Type[]>;
type ComponentGroups = Map<
  ComponentConstructor<Component>["name"],
  ComponentGroup<Component>
>;
type ComponentEventCallback = (...data: any[]) => void;
export default class Component extends Entity {
  #gameEntity: GameEntity;
  #isActive: boolean = true;
  constructor(gameEntity: GameEntity) {
    super();
    this.#gameEntity = gameEntity;
  }

  static componentGroups: ComponentGroups = new Map<
    ComponentConstructor<Component>["name"],
    ComponentGroup<Component>
  >();
  static create<Type extends Component>(
    type: ComponentConstructor<Type>,
    gameEntity: GameEntity,
    isActive = true
  ) {
    const component = new type(gameEntity);
    let componentGroup: ComponentGroup<Type> | undefined =
      this.componentGroups.get(type.name) as ComponentGroup<Type>;
    if (componentGroup === undefined) {
      componentGroup = new Map<number, Type[]>();
      this.componentGroups.set(type.name, componentGroup);
    }

    let components: Type[] | undefined = componentGroup.get(gameEntity.id);
    if (components === undefined) {
      components = [];
      componentGroup.set(gameEntity.id, components);
    }
    components.push(component);

    component.isActive = isActive;
    if (isActive) {
      const activeComponents = component.currentApp.activeComponents;
      activeComponents.set(component.id, component);
    }

    component.on("run", (key: keyof Type) => {
      if (key in component && typeof component[key] === "function") {
        (component[key] as unknown as () => void)();
      }
    });

    return component;
  }

  static find<Type extends Component>(
    type: ComponentConstructor<Type>
  ): ComponentGroup<Type>;
  static find<Type extends Component>(
    type: ComponentConstructor<Type>,
    gameEntityId: number
  ): Type[];
  static find<Type extends Component>(
    type: ComponentConstructor<Type>,
    gameEntityId?: number
  ): ComponentGroup<Type> | Type[] | null {
    const componentGroup = this.componentGroups.get(
      type.name
    ) as ComponentGroup<Type>;
    if (isNil(componentGroup)) {
      return null;
    } else {
      if (gameEntityId === undefined) {
        return componentGroup;
      }
      return componentGroup.get(gameEntityId) as Type[];
    }
  }

  /* shortcuts */
  get gameEntity() {
    return this.#gameEntity;
  }
  get currentScene() {
    return this.#gameEntity.scene;
  }
  get currentApp() {
    return this.#gameEntity.scene.app;
  }

  get isActive() {
    return this.#isActive;
  }
  set isActive(active) {
    if (this.#isActive !== active) {
      this.#isActive = active;
      const activeComponents = this.currentApp.activeComponents;
      if (active) {
        activeComponents.set(this.id, this);
      } else {
        activeComponents.delete(this.id);
      }
    }
  }

  getComponent<Type extends Component>(
    type: ComponentConstructor<Type>
  ): Type | null {
    return this.#gameEntity.getComponent<Type>(type);
  }

  #callbacks: { [event: string]: ComponentEventCallback[] } = {};
  on(event: string, callback: ComponentEventCallback) {
    this.#callbacks = this.#callbacks || {};
    (this.#callbacks[event] = this.#callbacks[event] || []).push(callback);
    return this;
  }
  emit(event: string, ...data: any[]) {
    this.#callbacks = this.#callbacks || {};

    const args = data.slice(0);
    let callbacks = this.#callbacks[event];

    if (callbacks) {
      callbacks = callbacks.slice(0);
      for (let i = 0, len = callbacks.length; i < len; ++i) {
        callbacks[i].apply(this, args);
      }
    }

    return this;
  }
}
