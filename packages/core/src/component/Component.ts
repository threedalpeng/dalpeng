import { isNil } from "../utils/basic.js";
import Entity from "../entity/Entity.js";
import type GameEntity from "../entity/GameEntity.js";

export type ComponentConstructor<Type extends Component> = new (
  gameEntity: GameEntity
) => Type;
interface ComponentGroup<Type extends Component> {
  [id: number]: Type[];
}
interface ComponentGroups {
  [type: ComponentConstructor<Component>["name"]]: ComponentGroup<Component>;
}
type ComponentEventCallback = (...data: any[]) => void;
export default class Component extends Entity {
  #gameEntity: GameEntity;
  #isActive: boolean = true;
  constructor(gameEntity: GameEntity) {
    super();
    this.#gameEntity = gameEntity;
  }

  static componentGroups: ComponentGroups = {};
  static create<Type extends Component>(
    type: ComponentConstructor<Type>,
    gameEntity: GameEntity,
    isActive = true
  ) {
    const component = new type(gameEntity);
    if (!this.componentGroups.hasOwnProperty(type.name)) {
      this.componentGroups[type.name] = {};
    }
    if (!this.componentGroups[type.name].hasOwnProperty(gameEntity.id)) {
      this.componentGroups[type.name][gameEntity.id] = [];
    }
    this.componentGroups[type.name][gameEntity.id].push(component);

    component.isActive = isActive;
    if (isActive) {
      const activeComponents = component.currentApp.activeComponents;
      activeComponents[component.id] = component;
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
    const typeList = this.componentGroups[type.name] as ComponentGroup<Type>;
    if (isNil(typeList)) {
      return null;
    } else {
      if (gameEntityId === undefined) {
        return typeList;
      }
      return typeList[gameEntityId] as Type[];
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
        activeComponents[this.id] = this;
      } else {
        delete activeComponents[this.id];
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
