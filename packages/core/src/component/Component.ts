import Entity from "../entity/Entity.js";
import type GameEntity from "../entity/GameEntity.js";
import { isNil } from "../utils/basic.js";

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
  componentGroup!: ComponentGroup<Component>;
  constructor(gameEntity: GameEntity) {
    super();
    this.#gameEntity = gameEntity;
  }

  #isSetup: boolean = false;
  setup() {
    this.#isSetup = true;
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
    component.componentGroup = componentGroup;

    let components: Type[] | undefined = componentGroup.get(gameEntity.id);
    if (components === undefined) {
      components = [];
      componentGroup.set(gameEntity.id, components);
    }
    components.push(component);

    component.isActive = isActive;
    if (isActive) {
      let activeComponents = gameEntity.currentApp.activeComponents;
      let components = activeComponents.get(type.name) as Type[];
      if (components === undefined) {
        components = [];
        activeComponents.set(type.name, components);
      }
      components.push(component);
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
  ): ComponentGroup<Type> | null;
  static find<Type extends Component>(
    type: ComponentConstructor<Type>,
    gameEntityId: number
  ): Type[] | null;
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
      return (componentGroup.get(gameEntityId) ?? []) as Type[];
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
      if (active) {
        if (!this.#isSetup) {
          this.setup();
        }
        this.gameEntity.currentApp.activeComponents.get(this.name)?.push(this);
      } else {
        const activeComponents =
          this.gameEntity.currentApp.activeComponents.get(this.name);
        const idx = activeComponents?.findIndex((c) => c === this) ?? -1;
        if (idx >= 0) {
          activeComponents?.splice(idx, 1);
        }
      }
    }
  }

  getComponent<Type extends Component>(
    type: ComponentConstructor<Type>
  ): Type | null {
    return this.#gameEntity.getComponent<Type>(type);
  }

  /** Event */
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
